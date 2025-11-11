NEWSCHEMA('Settings', function (schema) {

	schema.action('import', {
		name: 'Import backup',
		action: async function ($) {

			$.callback();
		}
	});

	schema.action('export', {
		name: 'Export backup',
		action: async function ($) {
			$.callback();
		}
	});
});
