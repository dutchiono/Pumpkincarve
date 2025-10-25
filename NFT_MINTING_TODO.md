# NFT Minting Implementation

## Current Status

The app now has:
- ✅ Clean, polished UI with Halloween animations
- ✅ User authentication via Farcaster QR code
- ✅ AI design generation (Gemini + DALL-E 3)
- ✅ Image generation working ($0.08 per image)
- ✅ **Farcaster native wallet-based minting implemented**

## NFT Minting Implementation

### Using Farcaster's Native Wallet SDK

Following the [Farcaster Mini App Wallet Documentation](https://miniapps.farcaster.xyz/docs/sdk/wallet), we're using the native wallet provider to mint NFTs directly from the user's wallet.

### How It Works

1. **User clicks "Mint NFT"**
2. **Check USDC allowance** - Query the user's USDC allowance for the NFT contract
3. **Approve USDC if needed** - If allowance is insufficient, prompt the user to approve 1 USDC
4. **Mint the NFT** - Call `purchasePumpkinCarving` on the NFT contract
5. **Transaction signed** - User signs both transactions in the Farcaster wallet

### Implementation Details

#### NFT Service (`app/services/nft.ts`)

Encodes transactions for:
- USDC approval: `NFTService.encodeApproval(contractAddress)`
- NFT purchase: `NFTService.encodePurchase(contractAddress, theme, description, imageUrl)`
- Allowance check: `NFTService.encodeAllowanceCheck(userAddress, contractAddress)`

#### Frontend (`app/components/PumpkinCarvingApp.tsx`)

The `handleMintNFT` function:
1. Gets the Farcaster wallet provider (`sdk.wallet.ethProvider`)
2. Checks USDC allowance
3. Requests approval transaction if needed
4. Sends mint transaction
5. Shows success message with transaction hash

### Required Setup

#### 1. Deploy NFT Contract

Deploy your NFT contract to Base Sepolia (testnet) or Base (mainnet):

```bash
npx hardhat run scripts/deploy.ts --network base-sepolia
```

#### 2. Update Environment Variables

Add to your `.env`:
```env
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=0xYourDeployedContractAddress
```

#### 3. Test the Flow

1. Sign in with Farcaster (QR code)
2. Generate pumpkin design
3. Generate pumpkin image
4. Click "Mint NFT"
5. Approve USDC (first time only)
6. Sign mint transaction
7. Receive NFT in your wallet

### Advantages

- ✅ Uses Farcaster's native wallet provider
- ✅ No server wallets required
- ✅ Users control their own transactions
- ✅ No Neynar server wallet setup needed
- ✅ Works entirely client-side

### Notes

- Users need at least 1 USDC on Base to mint
- First mint requires 2 transactions (approve + mint)
- Subsequent mints only need 1 transaction (if allowance is still valid)
- Transactions are signed in the Farcaster app

### Resources

- [Farcaster Wallet SDK Docs](https://miniapps.farcaster.xyz/docs/sdk/wallet)
- [Farcaster Mini App Docs](https://miniapps.farcaster.xyz/docs)
- [Viem Documentation](https://viem.sh/)
