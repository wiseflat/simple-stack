NEWSCHEMA('Inventory', function (schema) {
	async function buildInventory(hosts) {
		const inventory = {
			_meta: { hostvars: {} }
		};

		const ensureGroup = async (name) => {
			if (!inventory[name]) {
				inventory[name] = {
					hosts: [],
					children: [],
					vars: await ACTION('Variables/read2', { key2: name }).promise()
				};
			}
		};

		const addChild = async (parent, child) => {
			await ensureGroup(parent);
			await ensureGroup(child);
			if (!inventory[parent].children.includes(child)) {
				inventory[parent].children.push(child);
			}
		};

		for (const host of hosts) {
			const parts = host.hostname.split('.');

			// Defensive: ensure we have the expected number of parts
			if (parts.length < 5) {
				// Skip malformed hostnames but keep processing the rest
				continue;
			}

			const [instance, location, region, provider, project] = parts;

			// Group names – keep them deterministic and easy to read
			const infraGroup = 'infrastructure';
			const projectGroup = project;
			const providerGroup = `${provider}_${project}`;
			const regionGroup = `${region}_${provider}_${project}`;
			const locationGroup = `${location}_${region}_${provider}_${project}`;

			// Ensure all groups exist
			for (const g of [infraGroup, projectGroup, providerGroup, regionGroup, locationGroup]) {
				await ensureGroup(g);
			}

			// Build hierarchy
			await addChild(infraGroup, projectGroup);
			await addChild(projectGroup, providerGroup);
			await addChild(providerGroup, regionGroup);
			await addChild(regionGroup, locationGroup);

			// Add host to the leaf group
			if (!inventory[locationGroup].hosts.includes(host.hostname)) {
				inventory[locationGroup].hosts.push(host.hostname);
			}

			// Load host‑specific variables once
			const hostVars = await ACTION('Variables/read2', { key2: host.hostname }).promise();
			hostVars.projectid = host.id;
			inventory._meta.hostvars[host.hostname] = hostVars;
		}

		const softwares = await DATA.find('nosql/catalogs')
			.fields('name,version')
			// .error('@(Error)')
			.promise();

		inventory.infrastructure.vars.softwares = softwares.reduce((acc, cur) => {
			acc[cur.name] = { version: cur.version };
			return acc;
		}, {});

		return inventory;
	}

	schema.action('read', {
		name: 'Read an inventory',
		action: async function ($) {
			const result = await DATA.list('nosql/infrastructures')
				.where('uid', $.user.id)
				.error('@(Error)')
				.promise($);

			const dataset = [];

			for (const item of result.items) {
				if(!item.tfstate.resources) continue;
				for (const resource of item.tfstate.resources) {
					if(resource.type !== "ansible_host") continue;
					for (const instance of resource.instances) {
						dataset.push({ id: item.id, hostname: instance.attributes.name });
					}
				}
			}
			$.callback(await buildInventory(dataset), null, 2);
		}
	});
});
