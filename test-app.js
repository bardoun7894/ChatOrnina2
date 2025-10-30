const http = require('http');

const options = {
  hostname: '0.0.0.0',
  port: 3001,
  path: '/',
  method: 'GET',
  headers: {
    'User-Agent': 'Test-Client/1.0'
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ Application is running successfully!');
      console.log('Response status:', res.statusCode);
      console.log('Response data length:', data.length);
    } else {
      console.log('❌ Application returned an error:', res.statusCode);
    }
  });
});

req.on('error', (err) => {
  console.log('❌ Connection error:', err.message);
});

req.end();
