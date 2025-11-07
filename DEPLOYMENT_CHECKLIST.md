# Deployment Checklist

## Pre-Deployment

### 1. Environment Variables
Ensure all required environment variables are set in your production environment:

```bash
# Required
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_MAINNET_GEN1_NFT_CONTRACT_ADDRESS=0x...
REAL_WALLET=0x...
PRIVATE_KEY=your_private_key
ETHERSCAN_API_KEY=your_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# APIs
OPENAI_API_KEY=your_key
NEYNAR_API_KEY=your_key
NFT_STORAGE_API_KEY=your_key

# Optional
MOOD_ANALYSIS_PASSWORD=your_password
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

### 2. Database Setup
Run Supabase migrations on your production database:

**Option A: Supabase Dashboard (Recommended)**
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run `supabase/migrations/001_create_mood_analyses.sql`
4. Run `supabase/migrations/002_create_mints_table.sql`

**Option B: Supabase CLI**
```bash
supabase link --project-ref your-project-ref
supabase db push
```

**Option C: Verify with script**
```bash
node scripts/setup-database.cjs
```

### 3. Dependencies
Install all dependencies:
```bash
npm install
```

### 4. Build
Test build locally:
```bash
npm run build
```

### 5. Redis (For Worker Queue)
If using the worker queue system:
```bash
# Install Redis
sudo apt install redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify
redis-cli ping
```

### 6. Canvas (For Server-Side Rendering)
If using server-side NFT rendering:
```bash
# Install system dependencies (Ubuntu/Debian)
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

# Canvas should install automatically via npm install
```

## Deployment Steps

### 1. Push to Repository
```bash
git add .
git commit -m "Add Supabase mint tracking, leaderboard migration, and auto-share cast"
git push
```

### 2. Initial Server Setup (One-Time)
```bash
# Install dependencies
npm install

# Build the app
npm run build

# Set up PM2 (starts Next.js app + worker)
chmod +x scripts/setup-pm2.sh
./scripts/setup-pm2.sh

# Set up cron job for price automation (optional)
chmod +x scripts/setup-cron.sh
./scripts/setup-cron.sh
```

### 3. Deploy Application
**Simple deployment (after initial setup):**
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

**Or manually:**
```bash
git pull
npm install
npm run build
pm2 restart all
```

### 4. Set Environment Variables
Make sure all environment variables are set in `.env` file on the server.

### 5. Run Database Migrations
Follow the database setup instructions above (if not done already).

### 6. Set Up Price Automation (Optional)
Set up a cron job to run price adjustments:

**Option 1: Use setup script (easiest)**
```bash
chmod +x scripts/setup-cron.sh
./scripts/setup-cron.sh
```

**Option 2: Manual setup**
```bash
# Add to crontab
crontab -e

# Run every 10 minutes
*/10 * * * * cd /path/to/pumpkin-carving-nft && node scripts/auto-adjust-mint-price.cjs >> /var/log/gen1-nft/price-adjust.log 2>&1
```

See `CRON_SETUP.md` for detailed instructions.

## Post-Deployment Verification

### 1. Test Mint Tracking
1. Mint an NFT
2. Check Supabase `mints` table - should see the new mint
3. Check `admin_stats.total_mints` - should increment

### 2. Test Leaderboard
1. Visit `/leaderboard` page
2. Verify top minters/holders/gifters load
3. Check browser console for errors

### 3. Test Auto-Share Cast
1. Mint an NFT in Farcaster miniapp
2. Verify cast is automatically composed
3. Check that image and miniapp URL are included

### 4. Test Price Automation
1. Run manually: `node scripts/auto-adjust-mint-price.cjs`
2. Verify it checks total mints
3. Verify it updates price if threshold reached

### 5. Test Profile Page
1. Visit `/profile` page
2. Verify AI mood analysis displays (if available)
3. Verify admin tools show (if you're the owner)

## Monitoring

### Check Logs
```bash
# Application logs
# (depends on your hosting platform)

# Worker logs (if using PM2)
pm2 logs nft-worker

# Redis logs
sudo journalctl -u redis-server
```

### Monitor Database
- Check Supabase Dashboard for table sizes
- Monitor query performance
- Check for errors in Supabase logs

### Monitor Contracts
- Verify contract state: `node scripts/audit-gen1-contract.cjs`
- Check mint price: `node scripts/interact-with-contract.cjs`

## Troubleshooting

### Database Connection Issues
- Verify Supabase URL and keys are correct
- Check IP allowlist in Supabase Dashboard
- Verify tables exist using `setup-database.cjs`

### Leaderboard Not Loading
- Check if `mints` table has data
- Verify Supabase queries are working
- Check browser console for errors

### Mint Tracking Not Working
- Verify `/api/webhooks/mint` endpoint is accessible
- Check Supabase connection in logs
- Verify `mints` table exists

### Price Automation Not Working
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set
- Check script logs for errors
- Verify contract owner matches deployer address

## Rollback Plan

If something goes wrong:

1. **Revert Database**: Drop tables if needed (be careful!)
2. **Revert Code**: `git revert` or rollback deployment
3. **Revert Contract**: If price was changed incorrectly, manually set it back

## Support

For issues:
1. Check logs first
2. Verify environment variables
3. Check Supabase dashboard for database issues
4. Test locally with same environment variables

