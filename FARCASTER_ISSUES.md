# Farcaster Mini App - Issues & Fixes Required

Based on the [official Farcaster Mini App documentation](https://miniapps.farcaster.xyz/llms-full.txt), here are the critical issues that need to be fixed:

## ❌ CRITICAL ISSUES

### 1. **Wrong SDK Implementation**
**Current Problem:**
- Custom fake SDK in `app/services/farcaster.ts`
- Does not use the official `@farcaster/miniapp-sdk` package

**Required Fix:**
```typescript
// WRONG (current):
import { sdk } from '../services/farcaster';

// CORRECT (should be):
import { sdk } from '@farcaster/miniapp-sdk'
```

**Action Required:**
1. Install official SDK: `npm install @farcaster/miniapp-sdk`
2. Replace custom SDK with official import
3. Delete `app/services/farcaster.ts`

---

### 2. **Wrong SDK Method Call**
**Current Problem:**
```typescript
// Line 80 in PumpkinCarvingApp.tsx
await sdk.ready();
```

**Required Fix:**
```typescript
// Should be:
await sdk.actions.ready()
```

**From Documentation:**
> "After your app is fully loaded and ready to display: `await sdk.actions.ready()`"
>
> **Warning:** If you don't call `ready()`, users will see an infinite loading screen.

---

### 3. **Missing SDK Installation**
**Current Problem:**
- `@farcaster/miniapp-sdk` is NOT in `package.json`
- Using custom fake SDK instead

**Required Fix:**
```bash
npm install @farcaster/miniapp-sdk
```

---

### 4. **Wrong Manifest Structure**
**Current Problem:**
```typescript
// app/api/farcaster-manifest/route.ts
manifest: {
  accountAssociation: { ... },
  frame: { ... }
}
```

**Required Fix:**
```typescript
// Should be:
manifest: {
  accountAssociation: { ... },
  version: "1",  // Add at top level
  name: "Pumpkin Carving NFTs",
  iconUrl: "...",
  // Move all frame properties to top level
}
```

---

### 5. **Missing API Server Integration**
**Current Problem:**
- No backend to handle authenticated requests
- No Quick Auth integration

**Required Fix:**
According to the docs, you need a backend to:
1. Validate Quick Auth tokens
2. Make authenticated API calls using `sdk.quickAuth.fetch()`
3. Store user data and NFTs

**Example from documentation:**
```typescript
// Backend: Validate JWT token
import { verifyJwt } from '@farcaster/quick-auth'

app.get('/me', async (req) => {
  const token = req.headers.authorization.split(' ')[1]
  const payload = await verifyJwt({ token })
  // payload.sub = FID
})
```

---

### 6. **Embed Meta Tag Issues**
**Current Problem:**
```typescript
// layout.tsx - Wrong structure
frame: {
  version: "1",
  imageUrl: "...",
  button: { ... }
}
```

**Required Fix:**
According to docs, should be:
```html
<meta name="fc:miniapp" content='{"version":"1","imageUrl":"...","button":{...}}' />
```

**Button action type should be:**
```typescript
{
  title: "Carve Pumpkin",  // Max 32 chars
  action: {
    type: "launch_frame",  // NOT just a URL
    name: "Pumpkin Carving",
    url: "https://...",
    splashImageUrl: "...",
    splashBackgroundColor: "#..."
  }
}
```

---

### 7. **Missing Requirements**
**Current Problem:**
- No Node.js version check (requires 22.11.0+)
- No proper error handling for SDK failures

**Required Fix:**
1. Ensure Node.js 22.11.0+ is installed
2. Add error handling for SDK initialization
3. Handle case when not in Farcaster context

---

## 🔧 Action Plan

### Step 1: Install Official SDK
```bash
cd pumpkin-carving-nft
npm install @farcaster/miniapp-sdk
```

### Step 2: Update Component
Replace `app/components/PumpkinCarvingApp.tsx` to use:
```typescript
import { sdk } from '@farcaster/miniapp-sdk'

// After app loads:
await sdk.actions.ready()
```

### Step 3: Delete Fake SDK
Remove `app/services/farcaster.ts` entirely

### Step 4: Fix Manifest
Update `app/api/farcaster-manifest/route.ts` with correct structure

### Step 5: Add Backend (Optional but Recommended)
Create API routes for:
- User authentication via Quick Auth
- Data storage
- NFT metadata management

---

## 📚 Documentation References

- **Official Docs**: https://miniapps.farcaster.xyz
- **LLM-friendly Docs**: https://miniapps.farcaster.xyz/llms-full.txt
- **Quick Auth Guide**: https://miniapps.farcaster.xyz/docs/sdk/quick-auth
- **SDK Reference**: https://miniapps.farcaster.xyz/docs/sdk
