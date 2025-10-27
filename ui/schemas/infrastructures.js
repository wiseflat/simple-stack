NEWSCHEMA('Infrastructures', function (schema) {

	schema.action('spotlight', {
		name: 'Search item',
		params: '*prefix:String,*action:String',
		action: async function ($) {
			const { prefix, action } = $.params;
			const list = await $.action('Infrastructures/list').promise($);
			const result = list.map(item => ({
				id: action,
				api: 'projects_read',
				form: 'formproject',
				search: item.name,
				name: item.id,
				itemid: item.id,
				html: `${prefix}: <span class="gray">edit ${item.name}</span>`,
				icon: 'folder',
				color: 'blue'
			}));
			$.callback(result);
		}
	});

	schema.action('list', {
		name: 'List of cloud infrastructures',
		action: async function ($) {
			const result = await DATA
				.list('nosql/infrastructures')
				.where('uid', $.user.id)
				.fields('id,name,description,icon,color')
				.error('@(Error)')
				.promise($);
			$.callback(result.items);
		}
	});

	schema.action('list_instances', {
		name: 'List of cloud instances',
		action: async function ($) {
			const infrastructures = await DATA
				.find('nosql/infrastructures')
				.where('uid', $.user.id)
				.fields('tfstate')
				.error('@(Error)')
				.promise($);

			const instances = [];
			for (const infra of infrastructures) {
				if (!infra.tfstate?.resources) continue;
				for (const resource of infra.tfstate.resources) {
					if (!resource.instances) continue;
					if (resource.type !== "ansible_host") continue;
					for (const instance of resource.instances) {
						// instances.push({ id: instance.index_key, name: instance.index_key });
						instances.push({ id: instance.attributes.name, name: instance.attributes.name });
					}
				}
			}

			console.log(instances);
			$.callback(instances);
		}
	});

	schema.action('create', {
		name: 'Create project',
		input: '*name:String, *icon:Icon, *color:Color, *description:String, *admin_ip:String, *admin_login:String, *admin_pass:String',
		action: async function ($, model) {
			// Input validation – early exit on first failure
			const validators = [
				{ fn: REGEX_PROJECTS.name, field: 'name' },
				{ fn: REGEX_PROJECTS.description, field: 'description' },
				{ fn: REGEX_PROJECTS.admin_ip, field: 'admin_ip' },
				{ fn: REGEX_PROJECTS.admin_login, field: 'admin_login' },
				{ fn: REGEX_PROJECTS.admin_pass, field: 'admin_pass' }
			];
			for (const v of validators) {
				if (v.optional && (model[v.field] === '' || model[v.field] == null)) continue;
				if (!FUNC.regex(v.fn, model[v.field])) {
					$.invalid(`${v.fn.comment}`);
					return;
				}
			}

			// Populate system fields
			model.id = UID();
			model.uid = $.user.id;
			model.admin_pass = model.admin_pass.sha256(process.env.AUTH_SECRET);
			model.dtcreated = new Date();
			model.isarchived = false;
			model.tfstate = { version: 4 };

			await DATA.insert('nosql/infrastructures', model).error('@(Error)').promise($);
			$.success();
		}
	});

	schema.action('read', {
		name: 'Read a project',
		params: '*id:UID',
		action: async function ($) {
			const { id } = $.params;
			const result = await DATA
				.read('nosql/infrastructures')
				.where('uid', $.user.id)
				.where('id', id)
				.fields('id,name,description,admin_login,admin_ip,icon,color')
				.error('@(Error)')
				.promise($);
			$.callback(result);
		}
	});

	schema.action('update', {
		name: 'Update project',
		params: '*id:UID',
		input: '*name:String, *icon:Icon, *color:Color, *description:String, *admin_ip:String, *admin_login:String, admin_pass:String',
		action: async function ($, model) {
			const { id } = $.params;

			// Validate mutable fields
			const validators = [
				{ fn: REGEX_PROJECTS.name, field: 'name' },
				{ fn: REGEX_PROJECTS.description, field: 'description' },
				{ fn: REGEX_PROJECTS.admin_ip, field: 'admin_ip' },
				{ fn: REGEX_PROJECTS.admin_login, field: 'admin_login' }
			];
			for (const v of validators) {
				if (!FUNC.regex(v.fn, model[v.field])) {
					$.invalid(`${v.fn.comment}`);
					return;
				}
			}
			
			// Password handling – only hash when a new password is supplied
			if (model.admin_pass) {
				if (!FUNC.regex(REGEX_PROJECTS.admin_pass, model.admin_pass)) {
					$.invalid(`${REGEX_PROJECTS.admin_pass.comment}`);
					return;
				}
				model.admin_pass = model.admin_pass.sha256(process.env.AUTH_SECRET);
			} else {
				// Preserve existing hash
				const existing = await DATA
					.read('nosql/infrastructures')
					.where('uid', $.user.id)
					.where('id', id)
					.fields('admin_pass')
					.error('@(Error)')
					.promise($);
				model.admin_pass = existing.admin_pass;
			}

			model.dtupdated = new Date();

			await DATA
				.update('nosql/infrastructures', model)
				.where('id', id)
				.error('@(Error)')
				.promise($);
			$.success();
		}
	});

	schema.action('remove', {
		name: 'Remove infrastructure',
		params: '*id:UID',
		action: async function ($) {
			await DATA.remove('nosql/infrastructures')
				.where('uid', $.user.id)
				.where('id', $.params.id)
				.error('@(Error)')
				.promise($);
			$.success();
		}
	});

	schema.action('tfstates_read', {
		name: 'Read terraform states',
		params: '*id:UID',
		action: async function ($) {
			const { id } = $.params;
			const record = await DATA
				.read('nosql/infrastructures')
				.where('uid', $.user.id)
				.where('id', id)
				.error('@(Error)')
				.promise($);
			$.callback(record.tfstate);
		}
	});

	schema.action('tfstates_update', {
		name: 'Update terraform states',
		params: '*id:UID',
		action: async function ($, model) {
			const { id } = $.params;
			await DATA
				.update('nosql/infrastructures', { tfstate: model }, true)
				.where('uid', $.user.id)
				.where('id', id)
				.error('@(Error)')
				.promise($);
			$.success();
		}
	});
});