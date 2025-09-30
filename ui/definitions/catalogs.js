const splitCron = (cron) => cron.trim().split(/\s+/);
function cronsIntersect(cronA, cronB) {
  const a = splitCron(cronA);
  const b = splitCron(cronB);
  if (a.length !== 5 || b.length !== 5) return false;
  for (let i = 0; i < 5; i++) {
    const patA = a[i];
    const patB = b[i];
	if (patB === '*') continue;
    if (patA !== patB) return false;
  }
  return true;
}

ON('service', async function(counter) {
	const cronFromDate = new Date().format('mm HH dd M {0}'.format(new Date().getDay()));
	const catalogList = await ACTION('Catalogs/list').user({ id: 'bot', name: 'Bot', sa: true }).promise();
	for(let i=0; i<catalogList.items.length; i++){
		const cronStatic = catalogList.items[i].crontab;
		if (catalogList.items[i].cron && cronsIntersect(cronFromDate, cronStatic)) {
			// console.log('{0} / {1} - {2} => {3}'.format(catalogList.items[i].name, cronFromDate, catalogList.items[i].crontab, cronsIntersect(cronFromDate, cronStatic)));
			await ACTION('Catalogs/execute').params({id: catalogList.items[i].id}).user({ id: 'bot', name: 'Bot', sa: true }).promise();
		}
	}
});
