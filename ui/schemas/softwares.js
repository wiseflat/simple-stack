NEWSCHEMA('Softwares', function (schema) {

	const SIZES = [
		{ id: 'tiny',  name: 'Tiny' },
		{ id: 'small', name: 'Small' },
		{ id: 'medium', name: 'Medium' },
		{ id: 'large', name: 'Large' },
		{ id: 'xxl',   name: 'XXL' }
	];

	const EXPOSITIONS = [
		{ id: 'public',          name: 'Public domain managed' },
		{ id: 'public-unmanaged',name: 'Public domain created manually' },
		{ id: 'private',         name: 'Local domain' },
		{ id: 'none',            name: 'None' }
	];

	// Helper to validate model fields against the predefined regexes
	function validateModel(model, rules) {
		for (const [field, { regex, comment, optional }] of Object.entries(rules)) {
			if (optional && (model[field] === '' || model[field] == null)) continue;
			if (!FUNC.regex(regex, model[field])) {
				$.invalid(REGEX_SOFTWARES[field].comment);
				return false;
			}
		}
		return true;
	}

	// Enrich a software item with its name, variable‑id and secret‑id
	async function enrichSoftwareItem(item, $) {
		const [softwareRec, variableRec, secretRec] = await Promise.all([
			DATA.read('nosql/catalogs').where('id', item.software).fields('name,version').promise($),
			DATA.read('nosql/variables').where('key', item.domain).where('type', 'software').promise($),
			DATA.read('nosql/variables').where('key', item.domain).where('type', 'secret').promise($)
		]);

		item.software = softwareRec;
		if (variableRec) item.vid = variableRec.id;
		if (secretRec)   item.sid = secretRec.id;
	}

	schema.action('spotlight', {
		name: 'Search item',
		params: '*prefix:String,*action:String,*api:String, alias:String',
		action: async function ($) {
			const { prefix, action, api, alias } = $.params;
			const list = await $.action('Softwares/list').promise($);
			const result = list.map(item => ({
				id: action,
				api,
				form: 'formsoftware',
				search: item.domain,
				name: item.domain,
				itemid: item.id,
				html: `${prefix}: <span class="gray">${alias || action} ${item.domain}</span>`,
				icon: 'ti-cube',
				color: 'blue'
			}));
			$.callback(result);
		}
	});

	schema.action('list', {
		name: 'List all softwares',
		action: async function ($) {
			const result = await DATA.list('nosql/softwares')
				.where('uid', $.user.id)
				.fields('id,domain,version,software,size,instance')
				.error('@(Error)')
				.promise($);

			const settings = await DATA.read('nosql/variables')
				.where('key', 'catalogs')
				.where('type', 'settings')
				.promise($);

			// Enrich each item in parallel
			await Promise.all(result.items.map(item => enrichSoftwareItem(item, $)));

			$.callback({
				items: result.items.quicksort('instance'),
				settingsId: settings ? settings.id : undefined
			});
		}
	});

	schema.action('new', {
		name: 'Get all dependencies to create software',
		action: async function ($) {
			const result = {
				instances: await ACTION('Infrastructures/list_instances').user($.user).promise($),
				softwares: await DATA.find('nosql/catalogs').fields('id,name').error('@(Error)').promise($),
				sizes: SIZES,
				expositions: EXPOSITIONS,
				item: {}
			};
			$.callback(result);
		}
	});

	schema.action('read', {
		name: 'Read a software',
		params: '*id:UID',
		action: async function ($) {
			const { id } = $.params;
			const result = await ACTION('Softwares/new').user($.user).promise($);
			result.item = await DATA.read('nosql/softwares')
				.where('uid', $.user.id)
				.where('id', id)
				.fields('id,instance,domain,software,domain_alias,size,version,exposition')
				.error('@(Error)')
				.promise($);
			$.callback(result);
		}
	});

	schema.action('create', {
		name: 'Create a software',
		input: '*instance:String, *software:UID, *size:String, *domain:String, domain_alias:String, *exposition:String',
		action: async function ($, model) {
			const rules = {
				// instance: 		{ regex: REGEX_SOFTWARES.instance, comment: REGEX_SOFTWARES.instance.comment },
				// software:    	{ regex: REGEX_SOFTWARES.software,    comment: REGEX_SOFTWARES.software.comment },
				size: 			{ regex: REGEX_SOFTWARES.size, comment: REGEX_SOFTWARES.size.comment },
				domain:    		{ regex: REGEX_SOFTWARES.domain,    comment: REGEX_SOFTWARES.domain.comment },
				domain_alias:   { regex: REGEX_SOFTWARES.domain_alias,    comment: REGEX_SOFTWARES.domain_alias.comment, optional: true },
				exposition: 	{ regex: REGEX_SOFTWARES.exposition,    comment: REGEX_SOFTWARES.exposition.comment }
			};

			if (!validateModel(model, rules))
				return;

			model.id = UID();
			model.uid = $.user.id;
			model.dtcreated = new Date();
			model.status = true;
			model.version = 'latest';

			await DATA.insert('nosql/softwares', model).error('@(Error)').promise($);
			$.callback(model.id);
		}
	});

	schema.action('update', {
		name: 'Update software',
		params: '*id:UID',
		input: '*size:String, domain_alias:String, *exposition:String',
		action: async function ($, model) {
			const rules = {
				size: 			{ regex: REGEX_SOFTWARES.size, 			comment: REGEX_SOFTWARES.size.comment },
				domain_alias:   { regex: REGEX_SOFTWARES.domain_alias, 	comment: REGEX_SOFTWARES.domain_alias.comment, optional: true },
				exposition: 	{ regex: REGEX_SOFTWARES.exposition, 	comment: REGEX_SOFTWARES.exposition.comment }
			};

			if (!validateModel(model, rules))
				return;

			model.dtupdated = NOW;
			await DATA.update('nosql/softwares', model)
				.where('uid', $.user.id)
				.where('id', $.params.id)
				.error('@(Error)')
				.promise($);
			$.success();
		}
	});

	schema.action('update_version', {
		name: 'Update software version',
		params: '*id:UID',
		input: '*version:String',
		action: async function ($, model) {
			model.dtupdated = NOW;
			await DATA.update('nosql/softwares', model)
				.where('uid', $.user.id)
				.where('id', $.params.id)
				.error('@(Error)')
				.promise($);
			$.success();
		}
	});

	schema.action('remove', {
		name: 'Mark software as eligible for destruction',
		params: '*id:UID',
		action: async function ($) {
			await DATA.remove('nosql/softwares')
				.where('uid', $.user.id)
				.where('id', $.params.id)
				.error('@(Error)')
				.promise($);
			$.success();
		}
	});

	schema.action('execute', {
		name: 'Execute playbook',
		params: '*id:UID',
		input: '*action:{start|stop|main|backup|restore|destroy}',
		action: async function ($, model) {
			const item = await DATA.read('nosql/softwares')
				.where('uid', $.user.id)
				.where('id', $.params.id)
				.error('@(Error)')
				.promise($);

			const settingsRec = await DATA.read('nosql/variables')
				.where('key', 'softwares')
				.where('type', 'settings')
				.error('@(Settings are undefined)')
				.promise($);

			const decryptedSettings = JSON.parse(DECRYPT(settingsRec.value, process.env.AUTH_SECRET));

			const catalogName = (await DATA.read('nosql/catalogs')
				.where('id', item.software)
				.fields('name')
				.error('@(Error)')
				.promise($)).name;

			const payload = {
				meta: { hosts: item.instance },
				type: 'saas-operate',
				catalog: catalogName,
				domain: item.domain,
				task: model.action,
				confirmation: 'yes'
			};

			RESTBuilder.make(function (builder) {
				builder.method('POST');
				builder.url(decryptedSettings.url);
				builder.json(payload);
				builder.insecure();
				if (decryptedSettings.authentication) {
					builder.auth(decryptedSettings.login, decryptedSettings.password);
				}
				builder.callback(function (err, response, output) {
					$.success(!err);
				});
			});
		}
	});
});
