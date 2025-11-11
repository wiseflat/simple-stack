NEWSCHEMA('Users', function (schema) {

	const hash = value => value.sha256(process.env.AUTH_SECRET);
	const expire = (value = CONF.auth_cookie_expire) => NOW.add(value || '1 month');

	function validateModel(model, rules) {
		for (const [field, { regex, comment, optional }] of Object.entries(rules)) {
			if (optional && (model[field] === '' || model[field] == null)) continue;
			if (!FUNC.regex(regex, model[field])) {
				$.invalid(REGEX_USERS[field].comment);
				return false;
			}
		}
		return true;
	}

	schema.action('list', {
		name: 'List of users',
		permissions: 'admin',
		action: async function ($) {
			const users = await DATA.list('nosql/users')
				.error('@(Error)')
				.promise($);
			$.callback(users.items);
		}
	});

	schema.action('create', {
		name: 'Create user',
		input: '*first_name:String, *last_name:String, *email:Email, language:Lower(2), *password:String, *token:String, isdisabled:Boolean, sa:Boolean',
		permissions: 'admin',
		action: async function ($, model) {

			const rules = {
				language: { regex: REGEX_USERS.language, comment: REGEX_USERS.language.comment },
				email:    { regex: REGEX_USERS.email,    comment: REGEX_USERS.email.comment },
				password: { regex: REGEX_USERS.password, comment: REGEX_USERS.password.comment },
				token:    { regex: REGEX_USERS.token,    comment: REGEX_USERS.token.comment, optional: true }
			};

			if (!validateModel(model, rules))
				return;

			// Populate system fields
			Object.assign(model, {
				id: UID(),
				password: hash(model.password),
				token: hash(model.token),
				search: '',
				notifyurl: '',
				isinactive: false,
				isdisable: false,          // legacy flag kept for backward compatibility
				isonline: false,
				isremoved: false,
				dtlogued: '',
				dtexpire: expire(),
				dtcreated: NOW
			});

			await DATA.insert('nosql/users', model)
				.error('@(Error)')
				.promise($);

			$.success();
		}
	});

	schema.action('read', {
		name: 'Read user',
		params: '*id:UID',
		permissions: 'admin',
		action: async function ($) {
			const { id } = $.params;
			const result = await DATA.read('nosql/users')
				.where('id', id)
				.fields('id,first_name,last_name,email,language,dtlogged,isinactive,isonline,sa,isdisabled')
				.error('@(Error)')
				.promise($);
			$.callback(result);
		}
	});

	schema.action('update', {
		name: 'Update user',
		params: '*id:UID',
		input: '*first_name:String, *last_name:String, *email:Email, language:Lower(2), password:String, token:String, sa:Boolean, isdisabled:Boolean, isinactive:Boolean, notifications:Boolean',
		permissions: 'admin',
		action: async function ($, model) {
			const { id } = $.params;
			const user = await $.action('+Users/read').params({ id }).promise($);

			const rules = {
				language: { regex: REGEX_USERS.language, comment: REGEX_USERS.language.comment },
				email:    { regex: REGEX_USERS.email,    comment: REGEX_USERS.email.comment },
				password: { regex: REGEX_USERS.password, comment: REGEX_USERS.password.comment, optional: true },
				token:    { regex: REGEX_USERS.token,    comment: REGEX_USERS.token.comment, optional: true }
			};

			if (!validateModel(model, rules))
				return;

			// Preserve unchanged secret fields
			model.password = model.password ? hash(model.password) : user.password;
			model.token    = model.token ? hash(model.token) : user.token;

			await DATA.update('nosql/users', model)
				.where('id', id)
				.error('@(Error)')
				.promise($);

			$.success();
		}
	});

	schema.action('remove', {
		name: 'Remove user',
		params: '*id:UID',
		permissions: 'admin',
		action: async function ($) {
			const { id } = $.params;
			await DATA.remove('nosql/users')
				.where('id', id)
				.error('@(Error)')
				.promise($);
			$.success();
		}
	});

	schema.action('login', {
		name: 'Login',
		input: '*email:Email,*password:String',
		action: async function ($, model) {
			const user = await DATA.read('nosql/users')
				.where('email', model.email)
				.where('password', hash(model.password))
				.where('isinactive', false)
				.where('isremoved', false)
				.error('@(Invalid account)')
				.promise($);

			const session = {
				id: UID(),
				userid: user.id,
				ua: $.ua,
				ip: $.ip,
				device: $.mobile ? 'mobile' : 'desktop',
				dtexpire: NOW.add('1 day'),
				dtcreated: NOW,
				isonline: true,
				email: user.email,
				dtlogged: NOW
			};

			await DATA.insert('nosql/sessions', session).promise($);
			await DATA.update('nosql/users', { isonline: true, dtlogged: NOW })
			    .where('id', user.id)
			    .promise($);

			MAIN.session.authcookie($, session.id, session.userid, CONF.auth_cookie_expire);
			$.success();
		}
	});

	schema.action('profile_read', {
		name: 'Read user profile',
		action: async function ($) {
			const user = await DATA.read('nosql/users')
				.where('id', $.user.id)
				.fields('first_name,last_name,email,language')
				.error('@(Error)')
				.promise($);
			$.callback(user);
		}
	});

	schema.action('profile_update', {
		name: 'Save user profile',
		input: '*first_name:String, *last_name:String, *email:Email, *language:String',
		action: async function ($, model) {
			await DATA.update('nosql/users', model)
				.where('id', $.user.id)
				.error('@(Error)')
				.promise($);
			$.success();
		}
	});

	schema.action('password_update', {
		name: 'Change password',
		input: '*password:String',
		action: async function ($, model) {
			await DATA.update('nosql/users', { password: hash(model.password) })
				.where('id', $.user.id)
				.error('@(Error)')
				.promise($);
			$.success();
		}
	});

	schema.action('logout', {
		name: 'Logout user',
		action: function ($) {
			MAIN.session.logout($);
			$.redirect('/');
		}
	});
});