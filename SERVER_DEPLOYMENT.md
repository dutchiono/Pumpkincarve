# Server Deployment Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Environment Variables
Copy `.env.example` to `.env` and fill in all values, especially:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_MAINNET_GEN1_NFT_CONTRACT_ADDRESS`
- `REAL_WALLET`

### 3. Run Database Migrations

**Option 1: Supabase Dashboard (Easiest)**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to SQL Editor
4. Copy/paste and run:
   - `supabase/migrations/001_create_mood_analyses.sql`
   - `supabase/migrations/002_create_mints_table.sql`

**Option 2: Verify Setup**
```bash
node scripts/setup-database.cjs
```
This will check if tables exist and provide instructions.

### 4. Build and Deploy
```bash
npm run build
npm start
```

### 5. Start Worker (Optional - for NFT rendering queue)
```bash
npm run worker
```

Or with PM2:
```bash
pm2 start npm --name "nft-worker" -- run worker
pm2 save
```

### 6. Set Up Price Automation (Optional)
Add to crontab:
```bash
crontab -e
# Add this line:
*/10 * * * * cd /path/to/app && node scripts/auto-adjust-mint-price.cjs >> /var/log/price-adjust.log 2>&1
```

## What's Been Implemented

✅ **Supabase Database Schema**
- `mints` table - tracks all NFT mints
- `transfers` table - tracks NFT transfers for gifters leaderboard
- `admin_stats` table - stores total mints, price settings
- `mood_analyses` table - stores AI mood analysis results

✅ **Mint Tracking**
- Automatic tracking when users mint NFTs
- Updates `total_mints` counter in database
- Stores mint data (token_id, minter, block, transaction hash)

✅ **Leaderboard Migration**
- All leaderboard APIs now use Supabase instead of RPC calls
- Much faster and more reliable
- `/api/top-minters`, `/api/top-holders`, `/api/top-gifters` updated

✅ **Automated Price Adjustment**
- Script checks total mints from database
- Raises price by 10% every 50 mints (configurable)
- Can be run manually or via cron job

✅ **Auto-Share Cast**
- Automatically composes Farcaster cast after successful mint
- Includes NFT image/GIF and miniapp URL
- Only works in Farcaster miniapp context

✅ **Worker Updates**
- Returns `videoUrl` in job result (ready for MP4 later)
- Currently uses GIF as video (MP4 can be added later)

## Files Created/Modified

### New Files
- `supabase/migrations/001_create_mood_analyses.sql`
- `supabase/migrations/002_create_mints_table.sql`
- `supabase/README.md`
- `app/api/webhooks/mint/route.ts`
- `app/api/webhooks/transfer/route.ts`
- `scripts/setup-database.cjs`
- `scripts/auto-adjust-mint-price.cjs`
- `DEPLOYMENT_CHECKLIST.md`
- `SERVER_DEPLOYMENT.md`
- `IMPLEMENTATION_SUMMARY.md`

### Modified Files
- `app/components/Gen1MainApp.tsx` - added mint tracking and auto-share cast
- `app/api/top-minters/route.ts` - migrated to Supabase
- `app/api/top-holders/route.ts` - migrated to Supabase
- `app/api/top-gifters/route.ts` - migrated to Supabase
- `workers/nft-renderer.ts` - added videoUrl to result
- `package.json` - added @supabase/supabase-js

## Verification Checklist

After deployment, verify:

- [ ] Database tables exist (run `node scripts/setup-database.cjs`)
- [ ] Environment variables are set
- [ ] Mint tracking works (mint an NFT, check `mints` table)
- [ ] Leaderboard loads (visit `/leaderboard` page)
- [ ] Auto-share cast works (mint in Farcaster miniapp)
- [ ] Price automation script runs (test manually first)

## Troubleshooting

### Database Issues
- Verify Supabase credentials in `.env`
- Check Supabase Dashboard for connection issues
- Run `node scripts/setup-database.cjs` to verify tables

### Leaderboard Not Loading
- Check if `mints` table has data
- Verify Supabase queries in browser console
- Check API routes logs

### Mint Tracking Not Working
- Check `/api/webhooks/mint` endpoint logs
- Verify Supabase connection
- Check `mints` table exists

## Next Steps

1. **Deploy to production server**
2. **Run database migrations**
3. **Set environment variables**
4. **Test minting and verify tracking**
5. **Set up price automation cron job** (optional)
6. **Monitor logs and database**

For detailed information, see:
- `DEPLOYMENT_CHECKLIST.md` - Full deployment checklist
- `supabase/README.md` - Database setup instructions
- `IMPLEMENTATION_SUMMARY.md` - Technical implementation details

