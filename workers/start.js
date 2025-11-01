import worker from './nft-renderer.js';

console.log('NFT Renderer Worker started');
console.log('Waiting for jobs...');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down worker...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Shutting down worker...');
  await worker.close();
  process.exit(0);
});

