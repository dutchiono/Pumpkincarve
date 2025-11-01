# Feature Modules Documentation

This document describes the modular architecture of the app, which allows features to be archived and reactivated as needed.

## Overview

The app supports a modular architecture where features (especially seasonal ones) can be:
- **Active**: Currently live in production
- **Archived**: Stored in `app/seasonal-modules/` for future reactivation
- **Removed**: Code deleted (not recommended for seasonal features)

## Directory Structure

```
app/
├── seasonal-modules/              # Archived seasonal features
│   ├── FEATURE_MODULES.md         # This file
│   ├── REACTIVATION_GUIDE.md      # How to reactivate features
│   └── pumpkin-halloween-2024/    # Example archived module
│       ├── README.md              # Module documentation
│       ├── components/            # React components
│       ├── api/                   # API routes
│       ├── services/              # Service files
│       ├── assets/                # Static assets
│       └── contracts/             # Smart contracts
└── [active app code]
```

## Module Registry

### Archive Module List

| Module | Status | Active Period | Location |
|--------|--------|---------------|----------|
| Pumpkin Halloween 2024 | Archived | Oct-Nov 2024 | `app/seasonal-modules/pumpkin-halloween-2024/` |
| Gen1 Rocket Creator | Active | Current | `app/gen1-creator/` |

### Active Module List

| Module | Status | Location | Contract |
|--------|--------|----------|----------|
| Gen1 Rocket Creator | Active | `app/gen1-creator/` | `NEXT_PUBLIC_MAINNET_GEN1_NFT_CONTRACT_ADDRESS` |
| Pumpkin Leaderboard | Active (Legacy) | `app/components/PumpkinCarvingApp.tsx` | `NEXT_PUBLIC_NFT_CONTRACT_ADDRESS` |

## Module Lifecycle

### 1. Active
- Code lives in main app directories
- Feature is visible to users
- API routes functional
- Contract deployed and active

### 2. Deactivation
- Feature hidden from navigation
- API routes kept but unused
- Contract remains deployed
- User data preserved

### 3. Archive
- Code moved to `app/seasonal-modules/[module-name]/`
- Documentation added
- Dependencies noted
- Reactivation guide created

### 4. Reactivation (Future)
- Follow `REACTIVATION_GUIDE.md`
- Restore code to main app
- Update navigation
- Re-enable API routes
- Test thoroughly

## Adding a New Module

1. Create feature in main app
2. Test thoroughly
3. Document in this file
4. When archiving:
   - Move to `seasonal-modules/`
   - Add `README.md`
   - Update this registry

## Removing a Module

**⚠️ Warning**: Only remove modules that are NEVER coming back. For seasonal features, prefer archiving.

1. Check if module is in use
2. Archive first (keep backup)
3. Only after full decommission, delete
4. Update this registry

## Dependencies

Each module should document:
- Required API keys
- Environment variables
- External services
- Smart contracts
- Dependencies in `package.json`

## Best Practices

1. **Always archive, never delete** seasonal features
2. **Document thoroughly** before archiving
3. **Test reactivation** process annually
4. **Keep git history** for all modules
5. **Version control** module contracts

## Contract Management

Each module has associated smart contracts:
- Pumpkin: `NEXT_PUBLIC_NFT_CONTRACT_ADDRESS`
- Gen1: `NEXT_PUBLIC_MAINNET_GEN1_NFT_CONTRACT_ADDRESS`

**Important**: Never delete contract addresses from env files. Keep them documented even when archived.

## Environment Variables

Modules may need different environment variables. Document in:
- `.env.example`
- Each module's `README.md`
- This file

## Questions?

See `REACTIVATION_GUIDE.md` for how to bring features back, or contact the development team.

