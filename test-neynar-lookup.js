const { Configuration, NeynarAPIClient } = require('@neynar/nodejs-sdk');
require('dotenv').config();

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

const neynarConfig = new Configuration({
  apiKey: NEYNAR_API_KEY || '',
});

const client = new NeynarAPIClient(neynarConfig);

async function testLookup() {
  console.log('Testing Neynar lookup for username: ionoi');
  console.log('API Key exists:', !!NEYNAR_API_KEY);

  try {
    // Test 1: Try the method signature I used
    console.log('\n--- Test 1: lookupUserByUsername("ionoi", { viewerFid: 1 }) ---');
    const result1 = await client.lookupUserByUsername('ionoi', { viewerFid: 1 });
    console.log('Success! Result:', JSON.stringify(result1, null, 2));
  } catch (error) {
    console.log('Failed:', error.message);
  }

  try {
    // Test 2: Try without options
    console.log('\n--- Test 2: lookupUserByUsername("ionoi") ---');
    const result2 = await client.lookupUserByUsername('ionoi');
    console.log('Success! Result:', JSON.stringify(result2, null, 2));
  } catch (error) {
    console.log('Failed:', error.message);
  }

  try {
    // Test 3: Try with object parameter
    console.log('\n--- Test 3: lookupUserByUsername({ username: "ionoi" }) ---');
    const result3 = await client.lookupUserByUsername({ username: 'ionoi' });
    console.log('Success! Result:', JSON.stringify(result3, null, 2));
  } catch (error) {
    console.log('Failed:', error.message);
  }
}

testLookup().then(() => {
  console.log('\n✅ Tests complete');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});

