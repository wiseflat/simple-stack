NEWSCHEMA('Events', function(schema) {

	schema.action('create', {
		name: 'Create an event',
		permissions: 'events',
		input: '*event:{build|saas|paas}, *type:{info|warning|error}, *body:String',
		action: async function($, model) {
			model.id = UID();
			model.dtcreated = NOW;
			await DATA.insert('nosql/events', model)
				.error('@(Error creating event)')
				.promise($);
			$.success();
		}
	});

	schema.action('read', {
		name: 'Read a catalog item',
		input: '*event:{build|saas|paas}',
		permissions: 'events',
		action: async function($, model) {
			const result = await DATA.list('nosql/events')
				.where('event', model.event)
				.error('@(Error reading events)')
				.promise($);

			var arr = [];
			for(i=0; i<result.items.length; i++){
				arr.push({
					type: result.items[i].type,
					body: '{0} - {1}'.format(result.items[i].dtcreated, result.items[i].body)
				});
			}
			console.log(arr);
			console.log('---');
			$.callback(arr);
		}
	});

	schema.action('remove', {
		name: 'Remove a type of event',
		input: '*event:{build|saas|paas}',
		permissions: 'events',
		action: async function($, model) {
			console.log('event, remove', model);
			await DATA.remove('nosql/events')
				.where('event', model.event)
				.error('@(Error removing catalog)')
				.promise($);
			$.success();
		}
	});
});
