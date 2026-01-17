NEWSCHEMA('Events', function(schema) {

	schema.action('create', {
		name: 'Create an event',
		permissions: 'events',
		input: 'event_type, status, message, timestamp, playbook:Object, stats:Object, hosts_details:Object',
		action: async function($, model) {
			model.id = UID();
			model.dtcreated = NOW;
			model.timestamp = new Date().format('dd/MM/yyyy HH:mm:ss');
			await DATA.insert('nosql/events', model)
				.error('@(Error creating event)')
				.promise($);
			$.success();
		}
	});

	schema.action('read', {
		name: 'Read a catalog item',
		permissions: 'events',
		action: async function($, model) {

			const status = {
				success: 'info',
				failure: 'warning'
			};
			
			const result = await DATA.list('nosql/events')
				.error('@(Error reading events)')
				.promise($);

			result.items = result.items.quicksort('timestamp', true);
			var arr = [];
			for(i=0; i<result.items.length; i++){
				arr.push({
					type: status[result.items[i].status],
					body: '{0} - {1}'.format(result.items[i].timestamp, result.items[i].message)
				});
			}
			$.callback(arr);
		}
	});

	schema.action('remove', {
		name: 'Remove a type of event',
		permissions: 'events',
		action: async function($, model) {
			await DATA.remove('nosql/events')
				.error('@(Error removing catalog)')
				.promise($);
			$.success();
		}
	});
});
