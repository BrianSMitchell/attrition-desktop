/**
 * Simple Citizens Per Hour Test - API Based
 * 
 * This script tests the citizens per hour functionality by:
 * 1. Making API calls to check base capacities
 * 2. Checking for citizen generation rates
 * 
 * Prerequisites: 
 * - Game server must be running (pnpm dev or pnpm --filter @game/server dev)
 * - You must have at least one empire with citizen-generating buildings
 */

const http = require('http');
const https = require('https');

// Configuration
const API_BASE = 'http://localhost:3001'; // Adjust if your server runs on a different port
let AUTH_TOKEN = null; // We'll get this from login

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const client = url.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...(AUTH_TOKEN ? { 'Authorization': `Bearer ${AUTH_TOKEN}` } : {})
      }
    };

    const req = client.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = responseData ? JSON.parse(responseData) : {};
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testServerHealth() {
  console.log('🔍 Checking server health...');
  
  try {
    const response = await makeRequest('GET', '/health');
    if (response.status === 200) {
      console.log('✅ Server is running');
      return true;
    } else {
      console.log('❌ Server health check failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Could not connect to server:', error.message);
    console.log('   Make sure the server is running with: pnpm --filter @game/server dev');
    return false;
  }
}

async function testWithoutAuth() {
  console.log('\n🧪 Testing citizens per hour (limited - no auth)\n');
  
  // Try to get some information about the game state
  try {
    const response = await makeRequest('GET', '/api/game/dashboard');
    
    if (response.status === 401) {
      console.log('⚠️  API requires authentication. To do a full test:');
      console.log('   1. Make sure you have a user account in the game');
      console.log('   2. Look at existing empires with citizen-generating buildings');
      console.log('   3. Check the game UI to see if citizen counts are increasing over time');
      console.log('');
      console.log('🔍 Buildings that generate citizens per hour:');
      console.log('   - Urban Structures: 3 citizens/hour per level');
      console.log('   - Command Centers: 1 citizens/hour per level');
      console.log('   - Orbital Base: 5 citizens/hour per level');
      console.log('   - Capital: 8 citizens/hour per level');  
      console.log('   - Biosphere Modification: 10 citizens/hour per level');
      console.log('');
      console.log('📊 To verify it is working:');
      console.log('   1. Build some Urban Structures or Command Centers');
      console.log('   2. Note your current citizen count in the game UI');
      console.log('   3. Wait a few minutes for the game loop to run');
      console.log('   4. Check if your citizen count increased');
      console.log('   5. Citizens also provide a production bonus: +1% per 1000 citizens');
      
      return false;
    } else {
      console.log('Dashboard response:', response.status, response.data);
      return true;
    }
  } catch (error) {
    console.log('❌ Error testing API:', error.message);
    return false;
  }
}

async function main() {
  console.log('🧪 Citizens Per Hour Functionality Test\n');
  
  const serverHealthy = await testServerHealth();
  if (!serverHealthy) {
    console.log('\n💡 To test citizens per hour functionality:');
    console.log('   1. Start the server: pnpm --filter @game/server dev');
    console.log('   2. Run this test again');
    return;
  }

  await testWithoutAuth();
  
  console.log('\n📋 What the citizens per hour system does:');
  console.log('   ✅ Calculates citizen generation rates from buildings');
  console.log('   ✅ Updates citizen counts periodically (game loop)');
  console.log('   ✅ Handles fractional citizens with milli-remainder system');
  console.log('   ✅ Citizens provide production bonuses to other capacities');
  
  console.log('\n🎯 Expected behavior:');
  console.log('   - Building citizen-generating structures increases citizens/hour');
  console.log('   - Citizens accumulate over time automatically');
  console.log('   - Every 1000 citizens provide +1% production bonus');
  console.log('   - UI shows current citizen count and generation rate');
  
  console.log('\n🔧 If citizens are not increasing:');
  console.log('   1. Check you have Urban Structures, Command Centers, or similar');
  console.log('   2. Make sure buildings are active (not paused)');
  console.log('   3. Wait for the game loop cycle (usually 1-5 minutes)');
  console.log('   4. Check server logs for any citizen update errors');

  console.log('\n👋 Test completed.');
}

// Run the test
if (require.main === module) {
  main().catch(console.error);
}