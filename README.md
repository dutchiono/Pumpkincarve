# 🎃 Pumpkin Carving NFT Mini App

An AI-powered Base mini app that creates personalized pumpkin carving designs based on users' social media posts and sells them as NFTs for $1.

## Features

- **AI Analysis**: Analyzes the last 100 Farcaster posts to understand user personality and interests
- **Personalized Designs**: Generates unique pumpkin carving themes using OpenAI
- **NFT Minting**: Creates and mints personalized pumpkin carving NFTs
- **Base Pay Integration**: Simple $1 USDC payment flow
- **Social Integration**: Uses Neynar API to fetch user data from Farcaster

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Blockchain**: Base network, OnchainKit, Wagmi, Viem
- **AI**: OpenAI GPT-3.5-turbo and DALL-E 3
- **Social Data**: Neynar API for Farcaster integration
- **Payments**: Base Pay for USDC transactions

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Copy `env.example` to `.env.local` and fill in your API keys:

```bash
cp env.example .env.local
```

Required API keys:
- `NEXT_PUBLIC_NEYNAR_API_KEY`: Get from [Neynar](https://neynar.com/)
- `NEXT_PUBLIC_OPENAI_API_KEY`: Get from [OpenAI](https://openai.com/)
- `NEXT_PUBLIC_ONCHAINKIT_API_KEY`: Optional, get from [Coinbase Developer Platform](https://portal.cdp.coinbase.com/)

### 3. Deploy NFT Contract

Deploy the NFT contract to Base network using the provided Solidity code in `app/services/nft.ts`.

Update `NEXT_PUBLIC_NFT_CONTRACT_ADDRESS` in your environment variables.

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see your mini app.

## How It Works

1. **User Connection**: User connects their wallet (Base network)
2. **Data Fetching**: App fetches user's last 100 Farcaster posts via Neynar API
3. **AI Analysis**: OpenAI analyzes posts to determine personality, interests, and themes
4. **Design Generation**: AI creates a personalized pumpkin carving theme and description
5. **Image Creation**: DALL-E generates a visual design for the pumpkin carving
6. **Payment**: User pays $1 USDC using Base Pay
7. **NFT Minting**: Personalized NFT is minted and transferred to user

## Project Structure

```
pumpkin-carving-nft/
├── app/
│   ├── components/
│   │   └── PumpkinCarvingApp.tsx    # Main app component
│   ├── services/
│   │   ├── neynar.ts                # Neynar API integration
│   │   ├── ai.ts                    # OpenAI integration
│   │   └── nft.ts                   # NFT minting logic
│   ├── layout.tsx                   # App layout with OnchainKit
│   ├── page.tsx                     # Home page
│   └── globals.css                  # Global styles
├── config/
│   └── wagmi.ts                     # Wagmi configuration
├── package.json
├── tsconfig.json
└── next.config.js
```

## Deployment

### Deploy to Base Mini App Platform

1. Build the project:
```bash
npm run build
```

2. Follow Base's mini app deployment guide to deploy to their platform

### Deploy NFT Contract

Use the Solidity code provided in `app/services/nft.ts` to deploy your NFT contract to Base network.

## Customization

- **Themes**: Modify the theme generation logic in `app/services/ai.ts`
- **Pricing**: Change the $1 price in `app/components/PumpkinCarvingApp.tsx`
- **Design**: Update the UI components and styling
- **Analysis**: Adjust the post analysis algorithm in `app/services/neynar.ts`

## API Requirements

- **Neynar API**: For fetching Farcaster user data and posts
- **OpenAI API**: For AI analysis and image generation
- **Base RPC**: For blockchain interactions

## License

MIT License - feel free to modify and use for your own projects!

