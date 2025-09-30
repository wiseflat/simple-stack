CONF.$customtitles = true;
CONF.version = '1.1';

MAIN.users = [];

(async function() {
	var tmp = [];
	for (let m of tmp) {
		if (m !== null && m !== 'bot')
			MAIN.users.push(m);
	}
})();

LOCALIZE(ctrl => ctrl.query.language || (ctrl.user ? ctrl.user.language : CONF.language));