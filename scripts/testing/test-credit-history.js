// Quick test script to check if credit history endpoint works
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/game/credits/history?limit=10',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    // You'll need to add your auth token here
    'Authorization': 'Bearer YOUR_TOKEN_HERE'
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', JSON.parse(data));
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.end();
