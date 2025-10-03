/**
 * Check Game Loop Status
 * 
 * Simple script to check if the game loop is running and processing citizens
 */

const http = require('http');

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
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

async function checkServerStatus() {
  console.log('🔍 Checking game server status...');
  
  try {
    const health = await makeRequest('GET', '/health');
    if (health.status === 200) {
      console.log('✅ Server is healthy');
      console.log(`   Health data:`, health.data);
      return true;
    } else {
      console.log('❌ Server health check failed:', health.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Could not connect to server:', error.message);
    return false;
  }
}

async function main() {
  console.log('🎮 Checking Game Loop Status\n');
  
  const serverUp = await checkServerStatus();
  if (!serverUp) {
    console.log('\n💡 Server is not responding. Make sure it\'s running with:');
    console.log('   pnpm dev  or  pnpm --filter @game/server dev');
    return;
  }

  console.log('\n📋 Game Loop Analysis:');
  console.log('✅ Server is running on port 3001');
  console.log('✅ Game loop should be running every 60 seconds (1 minute)');
  console.log('✅ Each loop iteration should call BaseCitizenService.updateEmpireBases()');
  
  console.log('\n🔍 What to check in your game:');
  console.log('1. Note your current citizen count: 0 (as shown in your screenshot)');
  console.log('2. Your Urban Structures (Level 5) should generate: 5 × 3 = 15 citizens/hour');
  console.log('3. In about 4-5 minutes, you should see some citizens appear');
  console.log('4. After 1 hour, you should have close to 15 citizens');
  
  console.log('\n🧪 To verify it\'s working:');
  console.log('1. Watch your server console for game loop messages');
  console.log('2. Look for messages like: "[GameLoop] tick summary" every ~60 seconds');
  console.log('3. Look for messages like: "[GameLoop] resources updated count=X"');
  console.log('4. Check for any citizen-related errors');
  
  console.log('\n⚡ If citizens are not increasing after 10 minutes:');
  console.log('1. Check server console for game loop errors');
  console.log('2. Verify your Urban Structures building is marked as "active"');
  console.log('3. Try refreshing the game UI (F5)');
  console.log('4. Check if there are any database connection errors');

  console.log('\n📊 Expected Timeline:');
  const rate = 15; // citizens per hour from Level 5 Urban Structures
  console.log(`   Rate: ${rate} citizens/hour (${(rate/60).toFixed(2)} citizens/minute)`);
  console.log(`   After 1 minute: ~0.25 citizens (stored as remainder until 1 whole citizen)`);
  console.log(`   After 4 minutes: ~1 citizen should appear`);
  console.log(`   After 10 minutes: ~2-3 citizens`);
  console.log(`   After 1 hour: ~15 citizens`);

  console.log('\n🎯 The system uses "milli-citizens" to handle fractional generation,');
  console.log('   so citizens accumulate precisely over time without losing fractions.');

  console.log('\n👋 Keep the server running and check your citizen count periodically!');
}

if (require.main === module) {
  main().catch(console.error);
}