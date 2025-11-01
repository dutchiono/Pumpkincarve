# Pumpkin Halloween 2024 Archive

This directory contains the archived code and assets from the Pumpkin Carving NFT feature that was active during Halloween 2024.

## What Was Archived

### Components
- **PumpkinCarvingApp.tsx**: The original main app component with pumpkin carving functionality
  - Used OpenAI to analyze Farcaster posts and generate personalized pumpkin designs
  - Minted NFTs on Base blockchain
  - Included pumpkin-themed UI elements

### API Routes
- **generate-design/**: Analyzed user posts and created pumpkin designs
- **generate-image/**: Generated pumpkin images using DALL-E
- **mint-nft/**: Handled NFT minting via Neynar API

### Services
- **ai.ts**: AI service for personality analysis and image generation

### Contracts
- **PumpkinCarvingNFT.sol**: Solidity contract for pumpkin NFTs
  - ERC-721 implementation
  - Minting at 0.0003 ETH

### Assets
- digitalpumpkin.png
- gameoverpumpkin.png
- test-pumpkin.png
- gen2-assets/Base/Pumpkin.svg

## Environment Variables

The pumpkin feature used:
- `OPENAI_API_KEY`: For GPT-4 and DALL-E generation
- `NEYNAR_API_KEY`: For Farcaster integration
- `NFT_CONTRACT_ADDRESS`: Pumpkin NFT contract address

## Why Archived

Halloween 2024 is over, and the mint has ended. This code has been archived for future seasonal reactivation in 2026.

## Reactivation

See `REACTIVATION_GUIDE.md` in the parent `seasonal-modules/` directory for instructions on how to bring this feature back.

## Contract

The pumpkin NFT contract was deployed to:
- Base Mainnet (contract address: `NEXT_PUBLIC_NFT_CONTRACT_ADDRESS`)
- Base Sepolia testnet (for testing)

## Features

- AI-powered personality analysis from Farcaster posts
- Personalized pumpkin carving designs
- DALL-E 3 image generation
- Base blockchain minting
- IPFS storage
- Farcaster integration

## Notes

- Leaderboard functionality for pumpkins remains in the main app
- The minting process used OpenAI API (costs apply)
- All NFTs stored metadata on IPFS
- Used Neynar's NFT minting API for seamless Farcaster integration

