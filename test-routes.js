// Test script to check which route is undefined
require('dotenv').config();
const path = require('path');
require('module-alias')({ base: path.resolve(__dirname, 'api') });

const routes = require('./api/server/routes');

console.log('Testing route exports:');
for (const [name, route] of Object.entries(routes)) {
  console.log(`${name}:`, route === undefined ? 'UNDEFINED!' : typeof route);
}
