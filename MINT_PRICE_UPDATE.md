# Gen1 Mint Price Update Instructions

## Current Status
- **Contract Address**: `0xc03bC9D0BD59b98535aEBD2102221AeD87c820A6` (Base Sepolia)
- **Current Mint Price**: Variable (fetched from contract)
- **Target Mint Price**: 0.001 ETH = 1000000000000000 wei

## Updating Mint Price

The contract owner can update the mint price by calling the `setMintPrice` function.

### Using Etherscan / Basescan

1. Navigate to: https://sepolia.basescan.org/address/0xc03bC9D0BD59b98535aEBD2102221AeD87c820A6
2. Go to the "Contract" tab
3. Click "Write Contract"
4. Connect your wallet (must be the contract owner)
5. Find the `setMintPrice` function
6. Enter: `1000000000000000` (wei) = 0.001 ETH
7. Click "Write" and confirm the transaction

### Using Hardhat/Foundry Script

```javascript
// scripts/set-mint-price.js
const hre = require("hardhat");

async function main() {
  const GEN1_ADDRESS = "0xc03bC9D0BD59b98535aEBD2102221AeD87c820A6";
  const NEW_PRICE = hre.ethers.parseEther("0.001"); // 0.001 ETH in wei

  const [deployer] = await hre.ethers.getSigners();
  console.log("Setting mint price with account:", deployer.address);

  const gen1 = await hre.ethers.getContractAt("Gen3", GEN1_ADDRESS);

  const tx = await gen1.setMintPrice(NEW_PRICE);
  await tx.wait();

  console.log("Mint price updated to 0.001 ETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

Run with: `npx hardhat run scripts/set-mint-price.js --network baseSepolia`

## Verification

After updating, verify the new price by:

1. Calling `mintPrice()` on the contract
2. Checking the frontend at `/gen1-creator` - the price should display as "0.001 ETH"

## Notes

- The frontend automatically fetches the mint price from the contract on load
- No redeployment is needed - this is a simple contract state update
- The supply cap of 1111 is enforced in the frontend, not the contract
- Only the contract owner can call `setMintPrice`

## Contract Functions

```solidity
// Read current price
mintPrice() returns (uint256)

// Update price (owner only)
setMintPrice(uint256 _newPrice)

// Check current supply
totalSupply() returns (uint256) // returns nextTokenId - 1
```

## Economics

- **Mint Price**: 0.001 ETH (~$3.89 at current prices)
- **Max Supply**: 1111 NFTs
- **Maximum Revenue**: 1.111 ETH (~$4,320)
- **Cost per mint**:
  - Neynar API: 2 calls (user lookup + casts) = free tier
  - OpenAI GPT-4o-mini: ~$0.001 per analysis
  - IPFS: ~$0.01 per upload (Pinata free tier or web3.storage)
  - Total per mint: ~$0.011 in API costs

