NEWACTION('Common/version', {
	name: 'Version',
	action: function($) {
		$.success(CONF.version);
	}
});

NEWSCHEMA('Account', function(schema) {
	schema.action('create', {
		name: 'Create user account',
		input: '*email:Email, *password:String',
		action: async function($, model) {		
			if(!FUNC.regex(REGEX_USERS.email, model.email)) {
				$.invalid('{0}'.format(REGEX_USERS.email.comment));
				return;
			}
			if(!FUNC.regex(REGEX_USERS.password, model.password)) {
				$.invalid('{0}'.format(REGEX_USERS.password.comment));
				return;
			}

			const result = await DATA.find('nosql/users').promise($);
			if(result.length == 0){
				await ACTION('Users/create', { first_name: 'First', last_name: 'Admin', email: model.email, language: 'en', token: GUID(64), password: model.password, isdisabled: false, sa: true }).user({ id: 'bot', name: 'Bot', sa: true }).promise($);
				$.invalid('The first account has been create, try to log in now');
			}
			else {
				$.invalid('Registration is disabled, please try later');
			}

			
		}
	});

});