process.chdir('/app');
const {query} = require('./server/db');
Promise.all([
  query('SELECT id, name, company_id FROM equipment LIMIT 5'),
  query('SELECT id, company_id FROM users WHERE username = $1', ['admin_imp'])
]).then(([eq, us]) => {
  console.log('equipment:', JSON.stringify(eq.rows, null, 2));
  console.log('user:', JSON.stringify(us.rows, null, 2));
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
