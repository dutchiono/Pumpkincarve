# Seasonal Module Reactivation Guide

This guide explains how to reactivate archived seasonal features.

## Overview

Seasonal features like the Pumpkin Carving NFTs are archived in `app/seasonal-modules/` and can be reactivated for new seasons (e.g., Halloween 2026).

## Reactivation Process

### 1. Preparation

- [ ] Review archived module's `README.md`
- [ ] Check contract deployment requirements
- [ ] Verify API keys are still valid
- [ ] Review dependencies in `package.json`
- [ ] Check environment variables needed

### 2. Restore Components

For the Pumpkin module, restore to main app:

```bash
# Restore component
cp app/seasonal-modules/pumpkin-halloween-2024/components/PumpkinCarvingApp.tsx.backup app/components/PumpkinCarvingApp.tsx

# Or manually restore pumpkin tab from git history
git show HEAD:app/components/PumpkinCarvingApp.tsx > app/components/PumpkinCarvingApp.tsx.restored
```

### 3. Restore API Routes

```bash
# Restore pumpkin API routes
cp -r app/seasonal-modules/pumpkin-halloween-2024/api/* app/api/
```

### 4. Restore Services

```bash
# Restore AI service
cp app/seasonal-modules/pumpkin-halloween-2024/services/ai.ts app/services/
```

### 5. Restore Assets

```bash
# Restore public assets
cp app/seasonal-modules/pumpkin-halloween-2024/assets/* public/
```

### 6. Update Navigation

Add pumpkin tab back to `PumpkinCarvingApp.tsx`:

```typescript
const [activeTab, setActiveTab] = useState<'home' | 'leaderboard' | 'gen1' | 'profile'>('home');

// In navigation:
<button onClick={() => setActiveTab('home')}>🎃</button>
```

### 7. Environment Variables

Verify these are set in `.env.local`:

```bash
# Pumpkin Contract
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=<your-pumpkin-contract>

# OpenAI (for pumpkin generation)
OPENAI_API_KEY=<your-openai-key>

# Neynar (if using their minting API)
NEYNAR_API_KEY=<your-neynar-key>
NEYNAR_WALLET_ID=<your-wallet-id>
```

### 8. Smart Contract

**Option A**: Deploy new contract for new season
- Update `contracts/PumpkinCarvingNFT.sol` version string
- Deploy to Base Mainnet
- Update `NEXT_PUBLIC_NFT_CONTRACT_ADDRESS`

**Option B**: Reuse existing contract
- Only if contract supports multiple seasons
- Ensure proper versioning/tagging
- Document multi-season usage

### 9. Testing

- [ ] Test design generation
- [ ] Test image generation
- [ ] Test minting flow
- [ ] Test IPFS upload
- [ ] Test Farcaster integration
- [ ] Verify payment flow
- [ ] Test leaderboard

### 10. Documentation Updates

- [ ] Update `FEATURE_MODULES.md` to mark as "Active"
- [ ] Update app manifest
- [ ] Update marketing materials
- [ ] Announce reactivation

## Specific Module: Pumpkin Halloween

### Quick Reactivate Checklist

- [ ] Restore `app/components/PumpkinCarvingApp.tsx` pumpkin tab
- [ ] Restore `app/api/generate-design/`
- [ ] Restore `app/api/generate-image/`
- [ ] Restore `app/api/mint-nft/`
- [ ] Restore `app/services/ai.ts`
- [ ] Restore assets from `public/`
- [ ] Add 🎃 button to navigation
- [ ] Verify OpenAI API works
- [ ] Test full minting flow
- [ ] Verify IPFS storage
- [ ] Update app metadata
- [ ] Test on Base network

### Contract Considerations

The pumpkin contract was deployed as "Based Pumpkins 2025" (`BP2025`).

For 2026:
- Deploy new contract with "2026" branding
- Or use multi-year contract with versioning
- Update token name/description

### Cost Estimates

Per pumpkin NFT:
- OpenAI GPT-4: ~$0.01 (design)
- OpenAI DALL-E 3: $0.040 (image)
- IPFS pinning: ~$0.001
- Gas fees: ~$0.001

**Total**: ~$0.05 per mint (assuming 0.0003 ETH mint price)

### Deprecation Timeline

After season ends:
1. **Week 1**: Hide from navigation, keep APIs
2. **Week 2**: Archive code to `seasonal-modules/`
3. **Month 1**: Leave leaderboard visible
4. **Long term**: Keep archived, document for reactivation

## Troubleshooting

### API Issues

**OpenAI not working**
- Check API key is valid
- Verify billing is active
- Check rate limits

**Neynar errors**
- Verify API key
- Check wallet ID
- Ensure contract is registered

### Contract Issues

**Minting fails**
- Verify contract address
- Check Base network
- Ensure sufficient ETH
- Verify contract owner

### IPFS Issues

**Upload fails**
- Check Pinata API key
- Verify storage limits
- Check network connectivity

## Rollback Plan

If reactivation causes issues:

1. **Immediate**: Hide feature, keep APIs
2. **Short term**: Restore from git history
3. **Long term**: Archive again

```bash
# Rollback PumpkinCarvingApp.tsx
git checkout HEAD -- app/components/PumpkinCarvingApp.tsx

# Remove API routes
rm -rf app/api/generate-design
rm -rf app/api/generate-image
rm -rf app/api/mint-nft
```

## Future Improvements

Consider for future reactivation:
- [ ] Multi-season contract support
- [ ] Dynamic module loading
- [ ] Feature flags system
- [ ] Automated testing
- [ ] Cost monitoring
- [ ] Usage analytics

## Questions?

Contact the development team or check:
- `FEATURE_MODULES.md` for module registry
- Each module's `README.md` for specifics
- Git history for previous implementations

