# Deployment Guide for Pumpkin Carving NFT Mini App

## Prerequisites

1. **API Keys Required:**
   - Neynar API key from [neynar.com](https://neynar.com/)
   - OpenAI API key from [openai.com](https://openai.com/)
   - Optional: Coinbase OnchainKit API key from [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com/)

2. **Base Network Setup:**
   - Base network RPC URL
   - Private key for contract deployment
   - **Testnet Tokens (for Base Sepolia):**
     - ETH for gas fees: [Coinbase Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet) | [Optimism Faucet](https://app.optimism.io/faucet) | [Zora Faucet](https://portal.zora.co/faucet)
     - USDC for minting: Check Base documentation for USDC faucet
     - Alternatively, bridge from Sepolia to Base Sepolia if available

## Step 1: Environment Setup

1. Copy the environment file:
```bash
cp env.example .env.local
```

2. Fill in your API keys in `.env.local`:
```
NEXT_PUBLIC_NEYNAR_API_KEY=your_neynar_api_key
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_onchainkit_api_key
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
```

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Deploy NFT Contract

1. Install Hardhat dependencies:
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @openzeppelin/contracts
```

2. Add your private key to `.env.local`:
```
PRIVATE_KEY=your_private_key_here
BASESCAN_API_KEY=your_basescan_api_key_here
```

3. Compile the contract:
```bash
npx hardhat compile
```

4. Deploy to Base Sepolia (testnet first):
```bash
npx hardhat run scripts/deploy.ts --network base-sepolia
```

5. Verify the contract:
```bash
npx hardhat verify --network base-sepolia <CONTRACT_ADDRESS>
```

6. Deploy to Base Mainnet:
```bash
npx hardhat run scripts/deploy.ts --network base
```

7. Update `NEXT_PUBLIC_NFT_CONTRACT_ADDRESS` in `.env.local` with the deployed contract address.

## Step 4: Test the Application

1. Start the development server:
```bash
npm run dev
```

2. Visit `http://localhost:3000`

3. Connect your wallet (Base network)

4. Test the flow:
   - App should fetch your Farcaster posts
   - Generate a personalized pumpkin design
   - Allow payment with Base Pay
   - Mint the NFT

## Step 5: Deploy to Base Mini App Platform

1. Build the production version:
```bash
npm run build
```

2. Follow Base's mini app deployment process:
   - Submit your app for review
   - Provide app metadata and screenshots
   - Wait for approval

## Step 6: Production Considerations

### Security
- Never expose private keys in client-side code
- Use environment variables for all sensitive data
- Implement proper error handling
- Add rate limiting for API calls

### Performance
- Optimize image generation and storage
- Implement caching for user data
- Use CDN for static assets
- Monitor API usage and costs

### User Experience
- Add loading states and progress indicators
- Implement proper error messages
- Add confirmation dialogs
- Provide transaction status updates

## Troubleshooting

### Common Issues

1. **"User not found on Farcaster"**
   - Ensure the user has a Farcaster account
   - Check if the address is correctly linked to Farcaster

2. **"API key not found"**
   - Verify all API keys are set in `.env.local`
   - Check that environment variables start with `NEXT_PUBLIC_`

3. **"Contract not deployed"**
   - Ensure the contract is deployed to Base network
   - Verify the contract address is correct
   - Check that the contract has the correct ABI

4. **"Payment failed"**
   - Ensure user has USDC tokens
   - Check Base Pay configuration
   - Verify contract payment logic

### Testing Checklist

- [ ] User can connect wallet
- [ ] App fetches Farcaster posts successfully
- [ ] AI generates personalized design
- [ ] Payment flow works with Base Pay
- [ ] NFT is minted successfully
- [ ] User receives NFT in wallet
- [ ] Error handling works properly

## Support

For issues with:
- **Base Network**: Check [Base documentation](https://docs.base.org/)
- **OnchainKit**: Check [OnchainKit docs](https://onchainkit.xyz/)
- **Neynar API**: Check [Neynar docs](https://neynar.com/docs)
- **OpenAI API**: Check [OpenAI docs](https://platform.openai.com/docs)

