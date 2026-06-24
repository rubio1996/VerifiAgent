const http = require('http');

const data = JSON.stringify({ to: 'jjgc1996@gmail.com', name: 'Prueba' });

const options = {
  hostname: '127.0.0.1',
  port: 3001,
  path: '/api/email/send-test-email',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let body = '';
  res.setEncoding('utf8');
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log('BODY:', body);
  });
});

req.on('error', (e) => {
  console.error('REQUEST ERROR:', e.message);
});

req.write(data);
req.end();
