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
		action: function($, model) {		
			if(!FUNC.regex(REGEX_USERS.email, model.email)) {
				$.invalid('{0}'.format(REGEX_USERS.email.comment));
				return;
			}
			if(!FUNC.regex(REGEX_USERS.password, model.password)) {
				$.invalid('{0}'.format(REGEX_USERS.password.comment));
				return;
			}

			$.invalid('Registration is disabled, please try later');
		}
	});

});