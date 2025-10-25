# Clean Start Guide

This project was rebuilt from scratch using official Farcaster Mini App documentation.

## Quick Start

### 1. Clean Installation

Run these commands in PowerShell to start fresh:

```powershell
cd C:\Users\epj33\Desktop\Pumpkin\pumpkin-carving-nft

# Delete node_modules (if PowerShell asks to confirm, type 'Y')
Remove-Item -Recurse -Force node_modules

# Delete package-lock.json
Remove-Item package-lock.json

# Clear npm cache
npm cache clean --force

# Install fresh dependencies
npm install
```

### 2. Environment Setup

Copy the example environment file and add your API keys:

```powershell

Copy-Item env.example .env
```

Edit `.env` and add:
- `NEXT_PUBLIC_GEMINI_API_KEY` - Your Google AI Studio API key
- `NEYNAR_API_KEY` - Your Neynar API key
- Update domain URLs when deploying

### 3. Run Development Server

```powershell
npm run dev
```

Visit http://localhost:3000

## Changes Made

### Dependencies
- **Removed**: `canvas`, `sharp`, `axios`, `openai` (problematic or unnecessary)
- **Updated**: All packages to latest stable versions
- **Using**: `@farcaster/miniapp-sdk` (official SDK)

### Code Changes
- Updated `app/layout.tsx` to use proper `fc:miniapp` metadata
- Updated `app/components/PumpkinCarvingApp.tsx` to use the official Mini App SDK
- Calls `sdk.actions.ready()` to show the app

## What's Left to Do

1. **Install dependencies** (run the commands above)
2. **Add API keys** to `.env`
3. **Test the app** in development
4. **Deploy** the Mini App manifest
5. **Test in Farcaster** app

## Troubleshooting

If `npm install` still fails:
1. Close all editors and terminals
2. Restart your computer
3. Try the installation again

If you see TypeScript errors:
1. Wait for `npm install` to complete
2. Restart your IDE
3. The errors should clear
