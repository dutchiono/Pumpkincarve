
import { ethers } from 'ethers';
import { Level } from 'level';
import * as dotenv from 'dotenv';
dotenv.config();

const { RELAYER_PRIVATE_KEY } = process.env;
const BASE_RPC_ENDPOINT = process.env.BASE_RPC_ENDPOINT || 'http://localhost:8545'; // Placeholder, replace with actual Base RPC
const GEN2_CONTRACT_ADDRESS = '0xca3f315D82cE6Eecc3b9E29Ecc8654BA61e7508C';

if (!BASE_RPC_ENDPOINT || !RELAYER_PRIVATE_KEY || !GEN2_CONTRACT_ADDRESS) {
  throw new Error('Missing environment variables');
}

const provider = new ethers.JsonRpcProvider(BASE_RPC_ENDPOINT);
const relayerWallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);

import { gen2ABI } from './abi'; 

const gen2Contract = new ethers.Contract(GEN2_CONTRACT_ADDRESS, gen2ABI, relayerWallet);

const db = new Level('./db', { valueEncoding: 'json' });

async function main() {
  console.log('Starting watcher service...');

  // Scanner: Listen for Transfer events
  gen2Contract.on('Transfer', (from, to, tokenId) => {
    console.log(`Transfer detected: from ${from} to ${to}, tokenId ${tokenId}`);
    // TODO: Store the interaction in the database
  });

  // Aggregator & Relayer: Run once per day
  setInterval(async () => {
    console.log('Running daily aggregation and relay...');
    // TODO: Aggregate interactions from the database
    // TODO: Format the updates into the RelationUpdate struct
    // TODO: Call the batchUpdate function on the contract
  }, 24 * 60 * 60 * 1000); // 24 hours
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
