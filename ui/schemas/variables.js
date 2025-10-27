NEWSCHEMA('Variables', function (schema) {
	const YAML = require('yaml');
	const yamlToJson = (yamlString) => YAML.parse(yamlString);
	const jsonToYaml = (json) => {
		const obj = typeof json === 'string' ? JSON.parse(json) : json;
		return YAML.stringify(obj);
	};

	schema.action('list', {
		name: 'List of variables',
		action: async function ($) {
			const result = await DATA.find('nosql/variables')
				.error('@(Error)')
				.promise($);
			$.callback(result.quicksort('type'));
		}
	});

	schema.action('read', {
		name: 'Read a variable set',
		params: '*id:UID',
		input: '*key:String, *type:String, format:{yaml|json}',
		action: async function ($, model) {
			const { id } = $.params;
			const result = await DATA.read('nosql/variables')
				.where('id', id)
				.where('type', model.type)
				.error('@(Error)')
				.promise($);

			if (!result) {
				$.invalid(404, 'Variable not found');
				return;
			}

			const decrypted = DECRYPT(result.value, process.env.AUTH_SECRET);
			let value;
			try {
				value = JSON.parse(decrypted);
			} catch (_) {
				value = decrypted;
			}

			switch (model.format) {
				case 'yaml':
					result.value = value ? jsonToYaml(value) : '';
					break;
				case 'json':
				default:
					result.value = value ?? {};
			}
			$.callback(result);
		}
	});

	schema.action('read2', {
		name: 'Read a variable set',
		input: '*key2:String',
		action: async function ($, model) {
			const key2 = model.key2.replace(/\./g, '_');
			const variables = await DATA.find('nosql/variables')
				.where('key2', key2)
				.in('type', ['project', 'provider', 'location', 'region', 'instance'])
				.promise($);

			if (!variables?.length) {
				$.callback({});
				return;
			}

			const merged = variables.reduce((acc, variable) => {
				try {
					const parsed = JSON.parse(DECRYPT(variable.value, process.env.AUTH_SECRET));
					return { ...acc, ...parsed };
				} catch (_) {
					const raw = DECRYPT(variable.value, process.env.AUTH_SECRET);
					return { ...acc, ...raw };
				}
			}, {});
			$.callback(merged);
		}
	});

	schema.action('create', {
		name: 'Create a variable set',
		input: '*type:String, *key:String, value:String',
		action: async function ($, model) {
			const key2 = model.key.replace(/\./g, '_');
			const payload = {
				id: UID(),
				type: model.type,
				key: model.key,
				key2,
				dtupdated: NOW,
				value: ENCRYPT(JSON.stringify(yamlToJson(model.value)), process.env.AUTH_SECRET)
			};

			await DATA.insert('nosql/variables', payload)
				.error('@(Error)')
				.promise($);
			$.success();
		}
	});

	schema.action('update', {
		name: 'Update a variable set',
		params: '*id:UID',
		input: '*type:String, *key:String, status:Boolean, value:String',
		action: async function ($, model) {
			const { id } = $.params;
			const key2 = model.key.replace(/\./g, '_');

			const updatePayload = {
				status: model.status,
				value: ENCRYPT(JSON.stringify(yamlToJson(model.value)), process.env.AUTH_SECRET),
				dtupdated: NOW,
				key2
			};

			await DATA.update('nosql/variables', updatePayload, true)
				.where('id', id)
				.where('type', model.type)
				.where('key', model.key)
				.error('@(Error)')
				.promise($);
			$.success();
		}
	});

	schema.action('remove', {
		name: 'Remove a variable set',
		params: '*id:UID',
		action: async function ($) {
			const { id } = $.params;
			await DATA.remove('nosql/variables')
				.where('id', id)
				.error('@(Error)')
				.promise($);
			$.success();
		}
	});

	schema.action('secret', {
		name: 'Read a variable set',
		input: '*type:String, *key:String, subkey:String, missing:{create|warn|error}, nosymbols:Boolean, userpass:String, length:Number, overwrite:Boolean, delete:Boolean',
		action: async function ($, model) {
			const generatePassword = (userpass, nosymbols, length = 100) => {
				if (userpass && userpass.length) return userpass;
				const lettersDigits = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
				const symbols = '!@#$%^&*()_+[]{};:,.<>?/~';
				const charset = nosymbols ? lettersDigits : lettersDigits + symbols;
				const bytes = Total.Crypto.randomBytes(length);
				return Array.from({ length }, (_, i) => charset[bytes[i] % charset.length]).join('');
			};

			const result = await DATA.read('nosql/variables')
				.where('type', model.type)
				.where('key', model.key)
				.promise($);

			if (!result) {
				if (model.missing === 'create') {
					const newRecord = {
						id: UID(),
						type: model.type,
						key: model.key,
						key2: model.key.replace(/\./g, '_'),
						dtupdated: NOW,
						value: ENCRYPT({ [model.subkey]: generatePassword(model.userpass, model.nosymbols, model.length) }, process.env.AUTH_SECRET)
					};
					await DATA.insert('nosql/variables', newRecord)
						.error('@(Error)')
						.promise($);
					$.callback(newRecord.value[model.subkey]);
				} else {
					if (model.type === 'software') {
						const software = await DATA.read('nosql/softwares')
							.where('domain', model.key)
							.promise($);
						$.callback(software);
					} else {
						$.invalid(model.missing === 'error' ? 461 : 460);
					}
				}
				return;
			}

			let stored;
			try {
				stored = JSON.parse(DECRYPT(result.value, process.env.AUTH_SECRET));
			} catch (_) {
				stored = DECRYPT(result.value, process.env.AUTH_SECRET);
			}

			if (model.subkey) {
				const subExists = stored?.[model.subkey] !== undefined;

				if (!subExists && (model.missing === 'warn' || model.missing === 'error')) {
					$.invalid(model.missing === 'error' ? 461 : 460);
					return;
				}

				if (!subExists && model.missing === 'create') {
					stored[model.subkey] = generatePassword(model.userpass, model.nosymbols, model.length);
					await DATA.update('nosql/variables', { value: ENCRYPT(stored, process.env.AUTH_SECRET), dtupdated: NOW })
						.where('id', result.id)
						// .error('@(Error)')
						.promise($);
					$.callback(stored[model.subkey]);
					return;
				}

				if (model.overwrite) {
					stored[model.subkey] = generatePassword(model.userpass, model.nosymbols, model.length);
					await DATA.update('nosql/variables', { value: ENCRYPT(stored, process.env.AUTH_SECRET), dtupdated: NOW })
						.where('id', result.id)
						// .error('@(Error)')
						.promise($);
					$.success(stored[model.subkey]);
					return;
				}

				if (model.delete) {
					delete stored[model.subkey];
					await DATA.update('nosql/variables', { value: ENCRYPT(stored, process.env.AUTH_SECRET), dtupdated: NOW })
						.where('id', result.id)
						// .error('@(Error)')
						.promise($);
					$.success();
					return;
				}

				$.callback(stored[model.subkey]);
				return;
			}

			if (model.type === 'software') {
				const software = await DATA.read('nosql/softwares')
					.where('domain', model.key)
					.promise($);
				$.callback({ ...stored, ...software });
			} else {
				$.callback(stored);
			}
		}
	});
});