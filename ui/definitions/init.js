CONF.$customtitles = true;
CONF.version = '1.1';

LOCALIZE(ctrl => ctrl.query.language || (ctrl.user ? ctrl.user.language : CONF.language));