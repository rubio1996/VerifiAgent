const http = require('http');

const data = JSON.stringify({ match: true, distance: 0.3123 });

const options = {
  hostname: '127.0.0.1',
  port: 3001,
  path: '/api/biometrics/verify',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body);
  });
});

req.on('error', (e) => console.error('Request error', e));
req.write(data);
req.end();
