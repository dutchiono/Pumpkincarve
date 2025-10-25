const { ethers } = require("ethers");

// Create a random wallet
const wallet = ethers.Wallet.createRandom();

console.log("\n🎃 Deployer Wallet Created!\n");
console.log("Address:", wallet.address);
console.log("Private Key:", wallet.privateKey);
console.log("Mnemonic:", wallet.mnemonic.phrase);
console.log("\n⚠️  IMPORTANT:");
console.log("1. Copy the Private Key above");
console.log("2. Add it to your .env file as: PRIVATE_KEY=0x...");
console.log("3. Send Base Sepolia ETH to the Address");
console.log("4. Keep the Private Key SECRET!\n");
