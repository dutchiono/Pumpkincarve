# Implementation Summary - Mint Tracking, Leaderboard Migration, and Auto-Share Cast

## Overview
This implementation adds Supabase-based mint tracking, migrates leaderboard APIs to use the database, creates an automated price adjustment system, and implements automatic cast sharing after successful mints.

## Completed Features

### 1. Supabase Database Schema
- **Created `supabase/migrations/002_create_mints_table.sql`**:
  - `mints` table: Tracks all NFT mints (token_id, minter_address, block_number, transaction_hash, image_url, metadata_url)
  - `transfers` table: Tracks all NFT transfers for gifters leaderboard (from_address, to_address, is_mint, is_gift flags)
  - `admin_stats` table: Tracks admin data (total_mints, current_mint_price_wei, price_update_threshold, price_increase_percentage)
  - Indexes for fast queries on all tables
  - Helper function `increment_admin_stat()` for atomic counter updates

### 2. Mint Tracking Webhook
- **Created `app/api/webhooks/mint/route.ts`**:
  - Tracks mints when they happen
  - Called from `Gen1MainApp.tsx` after successful mint
  - Updates `total_mints` counter in `admin_stats` table
  - Idempotent (handles duplicate submissions gracefully)

### 3. Transfer Tracking Webhook
- **Created `app/api/webhooks/transfer/route.ts`**:
  - Tracks NFT transfers for gifters leaderboard
  - Automatically categorizes transfers as mints or gifts
  - Can be called from blockchain event listeners or manually

### 4. Leaderboard Migration to Supabase
- **Updated `app/api/top-minters/route.ts`**:
  - Now queries `mints` table from Supabase instead of RPC calls
  - Counts mints per address from database
  - Much faster and more reliable than blockchain queries

- **Updated `app/api/top-holders/route.ts`**:
  - Queries `transfers` table to track current ownership
  - Builds ownership map from transfer history
  - More efficient than querying `ownerOf` for each token

- **Updated `app/api/top-gifters/route.ts`**:
  - Queries `transfers` table where `is_gift = true`
  - Tracks gift counts and recipients
  - Single database query instead of multiple blockchain calls

### 5. Automated Price Adjustment Script
- **Created `scripts/auto-adjust-mint-price.cjs`**:
  - Checks total mints from Supabase `admin_stats` table
  - Raises price by configured percentage (default: 10%) every N mints (default: 50)
  - Calls `setMintPrice()` on contract if threshold is reached
  - Updates database with new price
  - Can be run as a cron job for automatic price adjustments

### 6. Auto-Share Cast After Mint
- **Updated `app/components/Gen1MainApp.tsx`**:
  - Stores `imageUrl` from render job result
  - After successful mint, automatically composes a Farcaster cast
  - Uses GIF/image URL and miniapp URL as embeds
  - Only triggers in Farcaster miniapp context
  - Gracefully handles user cancellation or errors

### 7. Worker Updates
- **Updated `workers/nft-renderer.ts`**:
  - Returns `videoUrl` field in job result (currently set to `imageUrl` for GIF)
  - MP4 generation can be added later using FFmpeg if needed
  - Ready for future MP4 support

### 8. Package Dependencies
- **Updated `package.json`**:
  - Added `@supabase/supabase-js` dependency
  - Required for database operations

## Database Setup Required

1. **Run Supabase migrations**:
   ```sql
   -- Run supabase/migrations/001_create_mood_analyses.sql
   -- Run supabase/migrations/002_create_mints_table.sql
   ```

2. **Set environment variables** (already in `env.example`):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

## Usage

### Manual Price Adjustment
Run the automated price adjustment script:
```bash
node scripts/auto-adjust-mint-price.cjs
```

### Automated Price Adjustment (Cron)
Set up a cron job to run the script periodically:
```bash
# Run every 10 minutes
*/10 * * * * cd /path/to/pumpkin-carving-nft && node scripts/auto-adjust-mint-price.cjs
```

### Leaderboard
The leaderboard now automatically uses Supabase data:
- `/leaderboard` page queries `/api/top-minters`, `/api/top-holders`, `/api/top-gifters`
- All APIs now use Supabase instead of blockchain RPC calls
- Much faster and more reliable

### Mint Tracking
Mints are automatically tracked when users mint NFTs:
- `Gen1MainApp.tsx` calls `/api/webhooks/mint` after successful mint
- Mint data is stored in Supabase `mints` table
- `total_mints` counter is automatically incremented

### Auto-Share Cast
After successful mint in Farcaster miniapp:
- Automatically composes a cast with "I just minted my Mood NFT by @ionoi!"
- Includes NFT image/GIF and miniapp URL as embeds
- User can cancel if they don't want to share

## Future Enhancements

1. **MP4 Video Generation**:
   - Install FFmpeg on server
   - Add MP4 generation to `workers/nft-renderer.ts`
   - Upload MP4 to IPFS alongside GIF
   - Use MP4 URL in auto-share cast for better Farcaster feed support

2. **Blockchain Event Listener**:
   - Set up a watcher/worker to listen for `Gen1Minted` and `Transfer` events
   - Automatically call webhooks when events are detected
   - Reduces dependency on frontend tracking

3. **Price Adjustment Automation**:
   - Set up cron job to run `auto-adjust-mint-price.cjs` periodically
   - Or use a service like GitHub Actions or Vercel Cron

4. **Historical Data Migration**:
   - Create a script to backfill historical mints from blockchain
   - Query past `Gen1Minted` events and populate `mints` table
   - Query past `Transfer` events and populate `transfers` table

## Notes

- The leaderboard APIs are now much faster since they query Supabase instead of making RPC calls
- Mint tracking is automatic but idempotent (safe to call multiple times)
- Price adjustment script checks ownership before updating price (security)
- Auto-share cast only works in Farcaster miniapp context
- MP4 generation is deferred for now (GIF works fine for Farcaster casts)

