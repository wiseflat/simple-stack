NEWSCHEMA('Graphs', schema => {

	const buildGraph = dataset => {
		const nodes = new Map();   // id → node object (unique)
		const links = [];          // array of edge objects

		// Fixed hierarchy order – keep it immutable and documented
		const LEVELS = Object.freeze(['project', 'provider', 'region', 'location', 'instance']);

		for (const { index_key } of dataset) {
			if (!index_key) continue;                     // guard against missing data
			const parts = index_key.split('.');           // e.g. ["instance001","frontends","region1","provider1","project1"]

			// Walk the parts from leaf → root to create nodes & links
			for (let i = parts.length - 1; i >= 0; i--) {
				const id = parts.slice(i).join('.');      // current node identifier
				const group = parts.length - i;           // depth (1‑based)
				const collection = LEVELS[group - 1] ?? 'unknown';

				// Create node only once
				if (!nodes.has(id)) {
					const baseNode = {
						id,
						key: id,
						group,
						description: id,
						collection
					};
					// For leaf “instance” nodes we keep the original id field
					if (collection === 'instance') baseNode.id = id;
					nodes.set(id, baseNode);
				}

				// Add a link to the parent (if any)
				if (i < parts.length - 1) {
					const parent = parts.slice(i + 1).join('.');
					links.push({
						source: id,
						target: parent,
						value: group - 1               // weight = distance to parent
					});
				}
			}
		}

		return {
			nodes: Array.from(nodes.values()),
			links
		};
	};

	schema.action('list', {
		name: 'List all projects as graph',
		async action($) {
			// Load infrastructures belonging to the current user
			const infraResult = await DATA
				.list('nosql/infrastructures')
				.where('uid', $.user.id)
				.fields('id,tfstate')
				.error('@(Error)')
				.promise($);

			// Flatten the tfstate resources → instances → index_key
			const dataset = (infraResult?.items ?? [])
				.flatMap(item => (item.tfstate?.resources ?? []))
				.flatMap(resource => (resource?.instances ?? []))
				.map(inst => ({ index_key: inst.index_key }));

			// Load software definitions (they are displayed as separate nodes)
			const softResult = await DATA
				.find('nosql/softwares')
				.where('uid', $.user.id)
				.error('@(Error)')
				.promise($);

			const softwareNodes = (softResult ?? []).map(s => ({
				id: s.domain,
				key: s.domain,
				description: s.domain,
				group: 7,                     // dedicated group for software
				collection: 'software'
			}));

			const softwareLinks = (softResult ?? []).map(s => ({
				source: s.domain,
				target: s.instance,
				value: 6                      // weight consistent with other links
			}));

			// Build the core graph and merge software data
			const graph = buildGraph(dataset);
			graph.nodes.push(...softwareNodes);
			graph.links.push(...softwareLinks);

			// Enrich nodes with variable IDs (if a variable exists for the node)
			for (const node of graph.nodes) {
				const variable = await DATA
					.read('nosql/variables')
					.where('key', node.id)
					.promise($);

				if (variable) {
					node.vid = variable.id;   // attach variable identifier
				}
			}
			$.callback(graph, null, 2);
		}
	});
});