NEWSCHEMA('Catalogs', function(schema) {

	function formatSpotlightItem(item, params) {
		return {
			id: params.action,
			api: 'catalogs_play',
			itemid: item.id,
			name: item.name,
			// `search` is used by the UI to filter results.
			search: `${item.name} ${item.alias.toLowerCase()}`,
			// `html` is the rendered line shown in the spotlight dropdown.
			html: `${params.prefix}: <span class="gray">${item.alias}</span>`,
			icon: 'cube',
			color: 'blue'
		};
	}

	schema.action('spotlight', {
		name: 'Search item',
		params: '*prefix:String,*action:String',
		action: async function($) {
			const { prefix, action } = $.params;
			const list = await $.action('Catalogs/list').promise($);
			const result = list.map(item => formatSpotlightItem(item, { prefix, action }));
			$.callback(result);
		}
	});

	schema.action('list', {
		name: 'List of catalog items',
		permissions: 'catalogs',
		action: async function($) {
			const [catalogs, settings] = await Promise.all([
				DATA.list('nosql/catalogs')
					.fields('id,name,origin,picto,suffix,alias,description,version,cron,crontab,fork')
					.error('@(Error loading catalogs)')
					.promise($),
				DATA.read('nosql/variables')
					.where('key', 'catalogs')
					.where('type', 'settings')
					.promise($)
			]);

			$.callback({
				items: catalogs.items.quicksort('name'),
				settingsId: settings?.id
			});
		}
	});

	schema.action('create', {
		name: 'Create catalog item',
		permissions: 'catalogs',
		input: '*name:String, *version:String',
		action: async function($, model) {
			model.id = UID();
			model.dtcreated = NOW;
			model.fork = false;

			const existing = await DATA.read('nosql/catalogs')
				.where('name', model.name)
				.promise($);

			if (existing === undefined) {
				await DATA.insert('nosql/catalogs', model)
					.error('@(Error creating catalog)')
					.promise($);
			} else {
				await DATA.update('nosql/catalogs', {
						version: model.version,
						dtupdated: NOW
					})
					.id(existing.id)
					.error('@(Error updating catalog)')
					.promise($);
			}
			$.success();
		}
	});

	schema.action('fork_create', {
		name: 'Fork catalog item',
		permissions: 'catalogs',
		input: '*origin:String, *version:String, *suffix:String, *alias:String, *description:String, *cron:Boolean, *crontab:String, *dockerfile_root:String, *dockerfile_nonroot:String',
		action: async function($, model) {

			const name = '{0}-{1}'.format(model.origin, model.suffix);
			const existing = await DATA.read('nosql/catalogs')
				.where('name', model.name)
				.where('suffix', model.suffix)
				.promise($);

			if (existing) {
				$.invalid('Catalog item already exists');
				return;
			}

			model.id = UID();
			model.dtcreated = NOW;
			model.fork = true;
			model.name = name;
			model.picto = model.origin;

			await DATA.insert('nosql/catalogs', model)
				.error('@(Error creating catalog)')
				.promise($);
			$.success();
		}
	});

	schema.action('fork_update', {
		name: 'Fork catalog item',
		params: '*id:UID',
		permissions: 'catalogs',
		input: '*origin:String, *suffix:String, *alias:String, *description:String, *cron:Boolean, *crontab:String, *dockerfile_root:String, *dockerfile_nonroot:String',
		action: async function($, model) {

			await DATA.update('nosql/catalogs', {
					name: '{0}-{1}'.format(model.origin, model.suffix),
					origin: model.origin,
					picto: model.origin,
					suffix: model.suffix,
					alias: model.alias,
					description: model.description,
					cron: model.cron,
					crontab: model.crontab,
					dockerfile_root: model.dockerfile_root,
					dockerfile_nonroot: model.dockerfile_nonroot,
					dtupdated: NOW
				})
				.id($.params.id)
				.error('@(Error updating catalog)')
				.promise($);
			$.success();
		}
	});


	schema.action('read', {
		name: 'Read a catalog item',
		params: '*id:UID',
		permissions: 'catalogs',
		action: async function($) {
			const result = await DATA.read('nosql/catalogs')
				.where('id', $.params.id)
				.error('@(Error reading catalog)')
				.promise($);
			$.callback(result);
		}
	});

	schema.action('update', {
		name: 'Update catalog item',
		params: '*id:UID',
		permissions: 'catalogs',
		input: '*alias:String, *description:String, documentation:String, *cron:Boolean, *crontab:String',
		action: async function($, model) {
			const { id } = $.params;

			// Validation – early exit on first failure
			if (!FUNC.regex(REGEX_CATALOGS.alias, model.alias)) {
				$.invalid(REGEX_CATALOGS.alias.comment);
				return;
			}
			if (!FUNC.regex(REGEX_CATALOGS.description, model.description)) {
				$.invalid(REGEX_CATALOGS.description.comment);
				return;
			}
			if (model.documentation && !FUNC.regex_noUnicode(REGEX_CATALOGS.documentation, model.documentation)) {
				$.invalid(REGEX_CATALOGS.documentation.comment);
				return;
			}
			if (!FUNC.regex(REGEX_CATALOGS.crontab, model.crontab)) {
				$.invalid(REGEX_CATALOGS.crontab.comment);
				return;
			}

			model.dtupdated = NOW;

			await DATA.update('nosql/catalogs', model)
				.where('id', id)
				.error('@(Error updating catalog)')
				.promise($);
			$.success();
		}
	});

	schema.action('remove', {
		name: 'Remove catalog item',
		params: '*id:UID',
		permissions: 'catalogs',
		action: async function($) {
			await DATA.remove('nosql/catalogs')
				.where('id', $.params.id)
				.error('@(Error removing catalog)')
				.promise($);
			$.success();
		}
	});

	schema.action('execute', {
		name: 'Execute a build',
		params: '*id:UID',
		action: async function($) {
			const { id } = $.params;

			const item = await DATA.read('nosql/catalogs')
				.where('id', id)
				.error('@(Error loading catalog)')
				.promise($);

			const settings = await DATA.read('nosql/variables')
				.where('key', 'catalogs')
				.where('type', 'settings')
				.error('@(Settings are undefined)')
				.promise($);

			const decrypted = JSON.parse(DECRYPT(settings.value, process.env.AUTH_SECRET));

			const payload = {
				meta: { hosts: decrypted.instance },
				type: 'saas-image',
				catalog: item.name,
				fork: item.fork
			};

			RESTBuilder.make(builder => {
				builder.method('POST');
				builder.url(decrypted.url);
				builder.json(payload);
				builder.insecure();
				if (decrypted.authentication) {
					builder.auth(decrypted.login, decrypted.password);
				}
				builder.callback((err, response, output) => {
					$.success(!err);
				});
			});
		}
	});
});
