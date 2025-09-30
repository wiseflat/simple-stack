NEWACTION('Spotlight/search', {
    name: 'Search item',
    query: 'q:String',
    async action($) {
        const query = $.query?.q?.toSearch() ?? '';
        const terms = query.trim().split(/\s+/);          // split on whitespace, ignore empty parts
        const [primary, secondary] = terms;               // primary = first term, secondary = optional second term

        const ORIGIN = [
            { id: 'projects',   form: 'forminfrastructures', search: 'infrastructure', name: TRANSLATE($.user.language || '', '@(Infrastructures)'), icon: 'folders',      color: '#C5FC7C' },
            { id: 'variables',  form: 'formvariables',       search: 'variables',      name: TRANSLATE($.user.language || '', '@(Variables)'),       icon: 'variables',    color: '#7BB2F9' },
            { id: 'catalogs',   form: 'formcatalogs',        search: 'catalog',        name: TRANSLATE($.user.language || '', '@(Catalog)'),         icon: 'cubes',        color: '#EA706B' },
            { id: 'softwares',  form: 'formsoftwares',       search: 'softwares',      name: TRANSLATE($.user.language || '', '@(Softwares)'),       icon: 'cube',         color: '#7BB2F9' },
            { id: 'settings',   form: 'formsettings',        search: 'settings',       name: TRANSLATE($.user.language || '', '@(Your profile)'),    icon: 'settings',     color: '#EB73F8' },
            { id: 'password',   form: 'formpassword',        search: 'user password',  name: TRANSLATE($.user.language || '', '@(Your password)'),   icon: 'key',          color: '#EB73F8' },
            { id: 'logout',     form: 'logout',              search: 'logout',         name: TRANSLATE($.user.language || '', '@(Logout)'),          icon: 'power-off',    color: '#EA71B0' }
        ];

        // Admin‑only entry
        if ($.user.sa) {
            ORIGIN.push({ id: 'users', form: 'formusers', search: 'users', name: TRANSLATE($.user.language || '', '@(Users)'), icon: 'users', color: '#EB73F8' });
        }

        const fetchSpotlight = async (module, params) => {
            const result = await $.action(`${module}/spotlight`).params(params).promise($);
            return result.filter(item => !secondary || item.search.includes(secondary));
        };

        const result = [];

        // Map of command prefixes → async fetcher
        const COMMANDS = [
            { prefix: 'soft',   module: 'Softwares',   action: 'edit',    api: 'softwares_read' },
            { prefix: 'redep',  module: 'Softwares',   alias: 'redeploy', action: 'main', api: 'softwares_execute' },
            { prefix: 'back',   module: 'Softwares',   action: 'backup',  api: 'softwares_execute' },
            { prefix: 'stop',   module: 'Softwares',   action: 'stop',    api: 'softwares_execute' },
            { prefix: 'start',  module: 'Softwares',   action: 'start',   api: 'softwares_execute' },
            { prefix: 'restore',module: 'Softwares',   action: 'restore', api: 'softwares_execute' },
            { prefix: 'build',  module: 'Catalogs',    action: 'build',   api: 'catalog_read' }
        ];

        // Try to match a special command
        const command = COMMANDS.find(c => primary?.includes(c.prefix));
        if (command) {
            const params = {
                prefix: command.module.slice(0, -1), // e.g. "Software" from "Softwares"
                action: command.action,
                api: command.api,
                ...(command.alias && { alias: command.alias })
            };
            const items = await fetchSpotlight(command.module, params);
            result.push(...items);
        } else {
            // No special command – filter static entries
            for (const item of ORIGIN) {
                if (primary && !item.search.includes(primary)) continue;
                result.push(item);
                if (result.length >= 100) break;
            }
        }

        $.callback(result);
    }
});
