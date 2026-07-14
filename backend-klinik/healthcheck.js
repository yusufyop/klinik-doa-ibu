// Health Check Endpoint Helper
const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 5000,
  path: '/api/cache-stats',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  console.log(`Health check: ${res.statusCode}`);
  process.exit(res.statusCode === 200 ? 0 : 1);
});

req.on('error', (e) => {
  console.error(`Health check failed: ${e.message}`);
  process.exit(1);
});

req.on('timeout', () => {
  console.error('Health check timed out');
  req.destroy();
  process.exit(1);
});

req.end();
