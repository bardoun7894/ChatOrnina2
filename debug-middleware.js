// Debug script to find undefined middleware in routes
require('dotenv').config();
const path = require('path');
require('module-alias')({ base: path.resolve(__dirname, 'api') });
const express = require('express');

console.log('=== Testing Individual Routes ===\n');

const routes = [
  'admin',
  'mcp',
  'edit',
  'auth',
  'billing',
  'keys',
  'user',
  'tags',
  'roles',
  'oauth',
  'files',
  'share',
  'banner',
  'convos',
  'search',
  'config',
  'models',
  'prompts',
  'categories',
  'tokenizer',
  'endpoints',
  'staticRoute',
  'messages',
  'memories',
  'presets',
  'balance',
  'plugins',
  'actions',
  'accessPermissions',
];

async function testRoute(routeName) {
  try {
    const app = express();
    console.log(`Testing route: ${routeName}`);
    
    const routeModule = require(`./api/server/routes/${routeName}`);
    
    if (routeName === 'files') {
      const initialized = await routeModule.initialize();
      app.use(`/api/${routeName}`, initialized);
    } else {
      app.use(`/api/${routeName}`, routeModule);
    }
    
    console.log(`✓ ${routeName} - OK\n`);
    return true;
  } catch (error) {
    console.log(`✗ ${routeName} - FAILED`);
    console.log(`Error: ${error.message}\n`);
    return false;
  }
}

async function runTests() {
  let failedRoutes = [];
  
  for (const route of routes) {
    const success = await testRoute(route);
    if (!success) {
      failedRoutes.push(route);
    }
  }
  
  console.log('\n=== Summary ===');
  console.log(`Total routes: ${routes.length}`);
  console.log(`Failed routes: ${failedRoutes.length}`);
  
  if (failedRoutes.length > 0) {
    console.log('\nFailed routes:');
    failedRoutes.forEach(route => console.log(`  - ${route}`));
  }
  
  process.exit(failedRoutes.length > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
