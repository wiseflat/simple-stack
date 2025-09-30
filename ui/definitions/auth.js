var opt = {};
opt.secret = '123456';
opt.cookie = CONF.auth_cookie;
opt.expire = '3 minutes';
opt.cleaner = '5 minutes';
opt.strict = false;
opt.ddos = 10;

opt.onauthorize = function($) {
	if ($.headers.authorization) {
		let authorization = $.headers.authorization.split(' ')[1];
		let bufferObj = Buffer.from(authorization, "base64");
		let decodedString = bufferObj.toString("utf8").split(':');

		DATA.read('nosql/users').where('email', decodedString[0]).where('password', decodedString[1].sha256(CONF.auth_secret)).where('isinactive', false).where('isremoved', false).callback(function(err, user){
			if(err){
				$.invalid(401);
			}
			else if(user === undefined){
				$.invalid(401);
			}
			else {
				$.user = {
					id: user.id
				}
				$.success({ id: user.id, name: user.name, sa: user.sa, permissions: ['admin'] });
			}			
		});	
		return true;
	}
};

opt.onread = async function(meta, next) {
	DATA.read('nosql/sessions').where('id', meta.sessionid).where('dtexpire', '>', NOW).callback(function(err, session){
		if(session){
			DATA.read('nosql/users').where('id', meta.userid).where('isdisabled', false).where('isinactive', false).callback(function(err, user){
				if (user) {
					if (!user.language)
						user.language = '';

					if (!user.permissions)
						user.permissions = [];

					user.admin = user.sa || user.permissions.includes('admin');
					next(null, user);
				} else
					next(404);
			});
		} else
			next(404);
	});
};

opt.onfree = async function(meta) {
	for(i=0; i<meta.sessions.length; i++){
		await DATA.update('nosql/sessions', { isonline: false }).where('isonline', true).id(meta.sessions[i]).promise();
	}

	if (meta.users && meta.users.length){
		for(i=0; i<meta.users.length; i++){
			await DATA.update('nosql/users', { isonline: false }).id(meta.users[i]).promise();
		}
	}
};

opt.onlogout = async function(meta){
	await DATA.remove('nosql/sessions').id(meta.sessionid).promise();
	await DATA.update('nosql/users', { isonline: false }).id(meta.userid).promise();
};

AUTH(opt);
MAIN.session = opt;

ON('configure', function() {
	opt.secret = CONF.auth_secret;
	opt.cookie = CONF.auth_cookie;
});

// The service below clears all sessions in 5 minutes interval
ON('service', async function(counter) {
	if (counter % 5 === 0) {
		await DATA.remove('nosql/sessions').where('dtexpire', '<', NOW).promise();
	}
});