NEWACTION('Spotlight/search', {
    name: 'Search item',
    async action($) {
        let ORIGIN = [];
        ORIGIN.push({ id: 'catalogs',   form: 'formcatalogs',        search: 'catalog',        name: TRANSLATE($.user.language || '', '@(Catalog)'),         icon: 'cubes',        color: '#EA706B' });
        ORIGIN.push('-');
        ORIGIN.push({ id: 'infrastructures',   form: 'forminfrastructures', search: 'infrastructure', name: TRANSLATE($.user.language || '', '@(Infrastructures)'), icon: 'sitemap',      color: '#C5FC7C' });
        ORIGIN.push({ id: 'softwares',  form: 'formsoftwares',       search: 'softwares',      name: TRANSLATE($.user.language || '', '@(Softwares)'),       icon: 'cube',         color: '#7BB2F9' });
        ORIGIN.push('-');
        ORIGIN.push({ id: 'variables',  form: 'formvariables',       search: 'variables',      name: TRANSLATE($.user.language || '', '@(Variables)'),       icon: 'variables',    color: '#7BB2F9' });
        ORIGIN.push('-');
        if ($.user.sa) {
            ORIGIN.push({ id: 'users', form: 'formusers', search: 'users', name: TRANSLATE($.user.language || '', '@(Users)'), icon: 'users', color: '#EB73F8' });
            ORIGIN.push('-');
        }
        ORIGIN.push({ id: 'profile',   form: 'formprofile',        search: 'profile',       name: TRANSLATE($.user.language || '', '@(Your profile)'),    icon: 'user',     color: '#EB73F8' });
        ORIGIN.push({ id: 'password',   form: 'formpassword',        search: 'user password',  name: TRANSLATE($.user.language || '', '@(Your password)'),   icon: 'key',          color: '#EB73F8' });
        ORIGIN.push('-');
        ORIGIN.push({ id: 'logout',     form: 'logout',              search: 'logout',         name: TRANSLATE($.user.language || '', '@(Logout)'),          icon: 'power-off',    color: '#EA71B0' });

        $.callback(ORIGIN);
    }
});
