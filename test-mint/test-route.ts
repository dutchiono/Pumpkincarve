// Test minting with a free public image URL
// This allows testing the full minting flow without generating AI images

// Use this free public pumpkin image for testing:
const TEST_IMAGE_URL = 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=1024';

export default function TestMintPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>🎃 Test Mint Page</h1>
      <p>Use this to test minting without generating AI images</p>
      <button
        onClick={async () => {
          // Test the mint flow with hardcoded image
          const response = await fetch('/api/test-mint', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageUrl: TEST_IMAGE_URL,
              theme: 'Test Pumpkin',
              description: 'A test pumpkin for minting',
            }),
          });

          const result = await response.json();
          alert(result.success ? '✅ Mint would succeed!' : '❌ Error: ' + result.error);
        }}
      >
        Test Mint (No IPFS)
      </button>
    </div>
  );
}
