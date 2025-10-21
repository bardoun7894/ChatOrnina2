// Test server route mounting to find undefined middleware
require('dotenv').config();
const path = require('path');
require('module-alias')({ base: path.resolve(__dirname, 'api') });
const express = require('express');

const app = express();

console.log('Loading routes module...');
const routes = require('./api/server/routes');

console.log('\nChecking route exports:');
for (const [name, route] of Object.entries(routes)) {
  console.log(`${name}: ${route === undefined ? 'UNDEFINED!' : typeof route}`);
}

console.log('\n=== Testing route mounting (simulating server.js) ===\n');

const testMounts = [
  { path: '/oauth', route: 'oauth' },
  { path: '/api/auth', route: 'auth' },
  { path: '/api/actions', route: 'actions' },
  { path: '/api/keys', route: 'keys' },
  { path: '/api/user', route: 'user' },
  { path: '/api/search', route: 'search' },
  { path: '/api/edit', route: 'edit' },
  { path: '/api/messages', route: 'messages' },
  { path: '/api/convos', route: 'convos' },
  { path: '/api/presets', route: 'presets' },
  { path: '/api/prompts', route: 'prompts' },
  { path: '/api/categories', route: 'categories' },
  { path: '/api/tokenizer', route: 'tokenizer' },
  { path: '/api/endpoints', route: 'endpoints' },
  { path: '/api/balance', route: 'balance' },
  { path: '/api/models', route: 'models' },
  { path: '/api/plugins', route: 'plugins' },
  { path: '/api/config', route: 'config' },
  { path: '/api/assistants', route: 'assistants' },
  { path: '/api/share', route: 'share' },
  { path: '/api/roles', route: 'roles' },
  { path: '/api/banner', route: 'banner' },
  { path: '/api/memories', route: 'memories' },
  { path: '/api/permissions', route: 'accessPermissions' },
  { path: '/api/tags', route: 'tags' },
  { path: '/api/mcp', route: 'mcp' },
  { path: '/api/admin', route: 'admin' },
  { path: '/api/billing', route: 'billing' },
];

async function testMount(path, routeName) {
  try {
    console.log(`Mounting ${routeName} at ${path}...`);
    
    if (routeName === 'files') {
      const initialized = await routes[routeName].initialize();
      app.use(path, initialized);
    } else {
      const route = routes[routeName];
      if (route === undefined) {
        throw new Error(`Route ${routeName} is undefined!`);
      }
      app.use(path, route);
    }
    
    console.log(`  ✓ Success\n`);
    return true;
  } catch (error) {
    console.log(`  ✗ FAILED: ${error.message}\n`);
    console.log(`  Stack: ${error.stack}\n`);
    return false;
  }
}

async function runTest() {
  let failed = [];
  
  for (const { path, route } of testMounts) {
    const success = await testMount(path, route);
    if (!success) {
      failed.push(route);
    }
  }
  
  // Test files route separately
  console.log('Testing files route (async initialize)...');
  try {
    const filesRouter = await routes.files.initialize();
    app.use('/api/files', filesRouter);
    console.log('  ✓ Files route success\n');
  } catch (error) {
    console.log(`  ✗ Files route failed: ${error.message}\n`);
    failed.push('files');
  }
  
  // Test staticRoute with middleware
  console.log('Testing staticRoute with createValidateImageRequest...');
  try {
    const { getAppConfig } = require('./api/server/services/Config');
    const createValidateImageRequest = require('./api/server/middleware/validateImageRequest');
    const appConfig = await getAppConfig();
    
    app.use('/images/', createValidateImageRequest(appConfig.secureImageLinks), routes.staticRoute);
    console.log('  ✓ StaticRoute success\n');
  } catch (error) {
    console.log(`  ✗ StaticRoute failed: ${error.message}\n`);
    console.log(`  Stack: ${error.stack}\n`);
    failed.push('staticRoute');
  }
  
  console.log('\n=== Summary ===');
  console.log(`Failed routes: ${failed.length}`);
  if (failed.length > 0) {
    console.log('Failed:');
    failed.forEach(r => console.log(`  - ${r}`));
  } else {
    console.log('All routes mounted successfully!');
  }
  
  process.exit(failed.length > 0 ? 1 : 0);
}

runTest().catch(err => {
  console.error('\n✗ Test failed with error:', err);
  process.exit(1);
});
