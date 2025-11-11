NEWSCHEMA('Settings', function (schema) {

	schema.action('import', {
		name: 'Import backup',
		input: '*import:String, *password:String',
		action: async function ($, model) {

			let projects = DECRYPT(model.import, model.password);
			if(!projects){
				$.invalid('invalid import');
				return;
			}

			// Process each project sequentially
			for (const project of projects) {

				// Infrastructure
				project.infrastructure.tfstate = JSON.stringify(project.infrastructure.tfstate);

				await ACTION('Infrastructures/import', project.infrastructure)
					.params({ id: project.infrastructure.id })
					.user($.user)
					.promise($);

				// Softwares
				await Promise.all(
					(project.softwares ?? []).map(software =>
						ACTION('Softwares/import', software)
							.params({ id: software.id })
							.user($.user)
							.promise($)
					)
				);

				// Variables
				await Promise.all(
				(project.variables ?? [])
					.map(variable => {
					// Guard against undefined/null values
					if (variable.value == null) return null;

					// Store the value as a JSON string for consistency
					variable.value = JSON.stringify(variable.value);

					return ACTION('Variables/import', variable)
						.params({ id: variable.id })
						.user($.user)
						.promise($);
					})
					.filter(Boolean) // remove the `null` placeholders
				);
			}
			$.success();
		}
	});

	schema.action('export', {
		name: 'Export backup',
		input: '*projects:Array, *password:String',
		action: async function ($, model) {

			const decryptValue = (value) => {
				const decrypted = DECRYPT(value, process.env.AUTH_SECRET);
				try {
					return JSON.parse(decrypted);
				} catch (_) {
					return decrypted;
				}
			};

			const logError = (err, ctx) => {
				console.error(`⚠️  ${ctx}:`, err);
			};

			const fetchVariables = async (key, cache = new Map()) => {
				if (cache.has(key)) return cache.get(key);
				const { items } = await DATA.list('nosql/variables')
					.where('key', key)
					.error('@(Error)')
					.promise($);
				cache.set(key, items);
				return items;
			};

			const fetchSoftwares = async (instanceName) => {
				const { items } = await DATA.list('nosql/softwares')
					.where('uid', $.user.id)
					.where('instance', instanceName)
					.error('@(Error)')
					.promise($);
				return items;
			};

			const resolveHostData = async (hostName) => {
				const [vars, softs] = await Promise.all([
					fetchVariables(hostName),
					fetchSoftwares(hostName),
				]);
				return { vars, softs };
			};

			const resolveSoftwareVars = async (softwares) => {
				const varPromises = softwares.map(async (software) => {
					if (!software.domain) return [];
					return fetchVariables(software.domain);
				});
				const results = await Promise.all(varPromises);
				return results.flat();
			};

			const buildProject = async (infra) => {
				if (!infra?.tfstate?.resources) return null;

				// Decrypt infrastructure‑level variables once
				let infraVars = [];
				try {
					infraVars = JSON.parse(DECRYPT(infra.variables, process.env.AUTH_SECRET));
				} catch (e) {
					logError(e, 'infra.variables decryption');
				}

				const project = {
					infrastructure: { ...infra, variables: infraVars },
					softwares: [],
					variables: [],
				};

				// Cache for variable look‑ups across hosts
				const varCache = new Map();

				// Process only ansible_host resources
				const hostResources = infra.tfstate.resources.filter(
					(r) => r.type === 'ansible_host' && r.instances
				);

				await Promise.all(
					hostResources.map(async (resource) => {
						await Promise.all(
							resource.instances.map(async (instance) => {
								const hostName = instance.attributes?.name;
								if (!hostName) return;

								// ---- a️  Hierarchical domain‑part variables ----
								const parts = hostName.split('.');
								const hierarchicalVars = [];
								for (let i = parts.length - 1; i >= 0; i--) {
									const id = parts.slice(i).join('.');
									const vars = await fetchVariables(id, varCache);
									if (vars?.length) hierarchicalVars.push(...vars);
								}
								project.variables.push(...hierarchicalVars);

								// ---- b️  Host‑level data ----
								const { vars: hostVars, softs: hostSofts } = await resolveHostData(hostName);
								project.variables.push(...hostVars);
								project.softwares.push(...hostSofts);

								// ---- c️  Software‑level variables ----
								const swVars = await resolveSoftwareVars(hostSofts);
								project.variables.push(...swVars);
							})
						);
					})
				);

				// Final flatten & decryption of variable values
				project.softwares = project.softwares.flat();
				project.variables = project.variables
					.flat()
					.map((v) => ({
						...v,
						value: decryptValue(v.value),
					}));

				return project;
			};

			const output = [];
			try {
				const infrastructures = await ACTION('Infrastructures/export')
					.params({ ids: model.projects })
					.user($.user)
					.promise($);

				const projects = await Promise.all(infrastructures.map(buildProject));

				projects.forEach((proj) => {
					if (proj) output.push(proj);
				});
			} catch (err) {
				logError(err, 'settings schema execution');
			}

			$.callback(ENCRYPT(output, model.password));
		}
	});
});
