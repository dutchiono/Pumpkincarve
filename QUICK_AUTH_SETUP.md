# Quick Auth Setup Guide

This document explains the Quick Auth integration that follows the [official Farcaster Mini App documentation](https://miniapps.farcaster.xyz/llms-full.txt).

## What Was Implemented

### 1. Official SDK Integration ✅
- **Removed**: Custom fake SDK (`app/services/farcaster.ts`)
- **Added**: Official `@farcaster/miniapp-sdk` package
- **Fixed**: Using `sdk.actions.ready()` instead of `sdk.ready()`

### 2. Quick Auth Backend ✅
- **Created**: `/app/api/auth/me/route.ts` - API endpoint to validate JWT tokens
- **Uses**: `@farcaster/quick-auth` package to verify tokens from Farcaster Quick Auth Server
- **Returns**: User information (FID) after successful authentication

### 3. Frontend Integration ✅
- **Modified**: `PumpkinCarvingApp.tsx` to use Quick Auth
- **Implemented**: Calls `sdk.quickAuth.fetch('/api/auth/me')` on mount
- **Sets**: Farcaster user state after successful authentication

### 4. Environment Variables ✅
- **Updated**: `env.example` with all required variables
- **Added**: `NEXT_PUBLIC_APP_URL` for JWT validation
- **Documented**: All API keys needed

## Setup Instructions

### Step 1: Install Dependencies

```bash
cd pumpkin-carving-nft
npm install
```

This will install:
- `@farcaster/miniapp-sdk` - Official Mini App SDK
- `@farcaster/quick-auth` - Backend JWT validation

### Step 2: Copy Environment File

```bash
cp env.example .env.local
```

### Step 3: Get API Keys

You need to obtain the following API keys:

#### A. Neynar API Key (Required)
1. Go to https://neynar.com/
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Add to `.env.local`:
   ```
   NEYNAR_API_KEY=your_neynar_api_key_here
   ```

#### B. OpenAI API Key (Required)
1. Go to https://platform.openai.com/api-keys
2. Sign up or log in
3. Create a new API key
4. Add to `.env.local`:
   ```
   NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here
   ```

#### C. App URL (Required)
For development:
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For production, replace with your actual domain:
```
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Step 4: Update Manifest URLs

Before deploying, update these files with your actual domain:

1. **`app/api/farcaster-manifest/route.ts`**:
   - Replace `https://your-domain.com` with your actual domain
   - Update `iconUrl`, `homeUrl`, and `appUrl`

2. **`app/layout.tsx`**:
   - Replace `https://your-domain.com/og-image.png` with your actual OG image URL
   - Replace `https://your-domain.com/splash.png` with your actual splash image URL

### Step 5: Create Required Images

You need to create and host these images:

1. **Icon** (200x200px): Your app icon
2. **OG Image** (3:2 aspect ratio, max 1024 chars URL): Preview image for sharing
3. **Splash Image** (200x200px): Image shown while loading

### Step 6: Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## How Quick Auth Works

### Flow Diagram

```
1. User opens Mini App in Farcaster client
   ↓
2. Frontend calls sdk.quickAuth.fetch('/api/auth/me')
   ↓
3. SDK automatically gets JWT token from Farcaster Quick Auth Server
   ↓
4. Token is sent as Bearer token to your backend API
   ↓
5. Backend validates token using @farcaster/quick-auth
   ↓
6. Backend returns user info (FID, etc.)
   ↓
7. Frontend receives user data and continues loading
```

### Key Components

#### Frontend (`app/components/PumpkinCarvingApp.tsx`)
```typescript
// Automatically gets token and makes authenticated request
const res = await sdk.quickAuth.fetch('/api/auth/me');

// Response contains user information
const data = await res.json();
console.log(data.user.fid); // Farcaster ID
```

#### Backend (`app/api/auth/me/route.ts`)
```typescript
// Extract token from Authorization header
const token = authHeader.split(' ')[1];

// Verify token
const payload = await quickAuthClient.verifyJwt({
  token,
  domain: process.env.NEXT_PUBLIC_APP_URL
});

// payload.sub contains the FID
const fid = payload.sub;
```

## Testing

### Test Authentication

1. Open browser console
2. Look for: `Authenticated as Farcaster user: [FID]`
3. If you see this, authentication is working!

### Test in Farcaster Client

1. Deploy your app (or use a tunnel like ngrok for testing)
2. Share your app URL in Farcaster
3. Click on the shared post
4. Mini App should open and authenticate automatically

## Troubleshooting

### Common Issues

#### 1. "Missing or invalid Authorization header"
- **Cause**: Frontend not sending token
- **Fix**: Make sure you're using `sdk.quickAuth.fetch()` not regular `fetch()`

#### 2. "Invalid or expired token"
- **Cause**: Token validation failing
- **Fix**: Check that `NEXT_PUBLIC_APP_URL` matches your actual domain

#### 3. "Module not found" errors
- **Cause**: Dependencies not installed
- **Fix**: Run `npm install` again

#### 4. Infinite loading screen
- **Cause**: `sdk.actions.ready()` not being called
- **Fix**: Make sure the code reaches and calls `await sdk.actions.ready()`

## Next Steps

After setting up Quick Auth:

1. **Implement Neynar Integration**: Use the API key to fetch user data
2. **Implement AI Design Generation**: Use OpenAI to create pumpkin designs
3. **Deploy NFT Contract**: Deploy to Base testnet/mainnet
4. **Add Payment Flow**: Implement USDC payment integration
5. **Deploy App**: Deploy to Vercel or your hosting provider

## Resources

- [Farcaster Mini App Docs](https://miniapps.farcaster.xyz)
- [Quick Auth Guide](https://miniapps.farcaster.xyz/docs/sdk/quick-auth)
- [Neynar API Docs](https://docs.neynar.com)
- [OpenAI API Docs](https://platform.openai.com/docs)
