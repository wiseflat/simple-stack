exports.install = function() {

	ROUTE('GET    /api/ping', ping);

	// Users 
	ROUTE('+API    /api/       +users                 --> Users/list');
	ROUTE('+API    /api/       +users_read/{id}       --> Users/read');
	ROUTE('+API    /api/       +users_create          --> Users/create');
	ROUTE('+API    /api/       +users_update/{id}     --> Users/update');
	ROUTE('+API    /api/       -users_remove/{id}     --> Users/remove');
	ROUTE('-API    /api/       +login                 --> Users/login');

	ROUTE('+API    /api/       -settings_read         --> Users/settings_read');
	ROUTE('+API    /api/       +settings_update       --> Users/settings_update');
	ROUTE('+API    /api/       +password              --> Users/password_update');
	ROUTE('+GET    /logout/                           --> Users/logout');

	// Misc
	ROUTE('-API    /api/       +account_create            --> Account/create');
	ROUTE('+API    /api/       -version                   --> Common/version');
	ROUTE('+API     /api/     	+search            		  --> Spotlight/search');

	ROUTE('+API    /api/       +catalogs                   --> Catalogs/list');
	ROUTE('+API    /api/       +catalogs_read/{id}         --> Catalogs/read');
	ROUTE('+API    /api/       +catalogs_create            --> Catalogs/create');
	ROUTE('+API    /api/       +catalogs_update/{id}       --> Catalogs/update');
	ROUTE('+API    /api/       +catalogs_fork_create       --> Catalogs/fork_create');
	ROUTE('+API    /api/       +catalogs_fork_update/{id}  --> Catalogs/fork_update');
	ROUTE('+API    /api/       +catalogs_fork_remove       --> Catalogs/fork_remove');
	ROUTE('+API    /api/       +catalogs_remove/{id}       --> Catalogs/remove');
	ROUTE('+API    /api/       +catalogs_execute/{id}      --> Catalogs/execute');

	// infrastructures
	ROUTE('+API    /api/       -infrastructures                   --> Infrastructures/list');
	ROUTE('+API    /api/       +infrastructures_read/{id}         --> Infrastructures/read');
	ROUTE('+API    /api/       +infrastructures_create            --> Infrastructures/create');
	ROUTE('+API    /api/       +infrastructures_update/{id}       --> Infrastructures/update');
	ROUTE('+API    /api/       +infrastructures_remove/{id}       --> Infrastructures/remove');

	ROUTE('+POST   /api/tfstates/{id}/                            --> Infrastructures/tfstates_update');
	ROUTE('+GET    /api/tfstates/{id}/                            --> Infrastructures/tfstates_read');

	// Inventory
	ROUTE('+GET    /api/inventory --> Inventory/read');

	// Software
	ROUTE('+API    /api/       -softwares		                     --> Softwares/list');
	ROUTE('+API    /api/       +softwares_new           	         --> Softwares/new');
	ROUTE('+API    /api/       +softwares_read/{id}        	         --> Softwares/read');
	ROUTE('+API    /api/       +softwares_create                     --> Softwares/create');
	ROUTE('+API    /api/       +softwares_update/{id}                --> Softwares/update');
	ROUTE('+API    /api/       +softwares_update_version/{id}        --> Softwares/update_version');
	ROUTE('+API    /api/       +softwares_remove/{id}                --> Softwares/remove');
	ROUTE('+API    /api/       +softwares_execute/{id}               --> Softwares/execute');
	
	// Variables
	ROUTE('+API    /api/       +variables		                     --> Variables/list');
	ROUTE('+API    /api/       +variables_read/{id}                  --> Variables/read');
	ROUTE('+API    /api/       +variables_create                     --> Variables/create');
	ROUTE('+API    /api/       +variables_update/{id}                --> Variables/update');
	ROUTE('+API    /api/       +variables_remove/{id}                --> Variables/remove');
	ROUTE('+POST   /api/secret                                       --> Variables/secret');

	// 3dForceGraph
	ROUTE('+API    /api/       -graphs					  --> Graphs/list');

	ROUTE('+SOCKET  /api/', socket);
};

function ping($) {
	$.success();
}

function socket($) {

	var clients = {};

	MAIN.ws = $;

	$.autodestroy(() => MAIN.ws = null);

	$.on('open', function(client) {
		var msg = { TYPE: 'sync', data: clients };
		client.send(msg);
	});

	$.on('close', function(client) {
		$.send({ TYPE: 'close', data: clients[client.query.id], clientid: client.query.id });
		delete clients[client.query.id];
	});

	$.on('message', function(client, msg) {
		if (msg.TYPE === 'ticket') {
			client.ticketid = msg.id;
			clients[client.query.id] = { clientid: client.query.id, userid: client.user.id, ticketid: msg.id };
			$.send({ TYPE: 'ticket', data: clients[client.query.id], clientid: client.query.id });
		}
	});
}
