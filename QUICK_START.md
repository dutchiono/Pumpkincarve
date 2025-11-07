# Quick Start - Deploy to Server

## Step 1: Run Database Migrations (2 minutes)

**Use Supabase Dashboard (easiest, no CLI needed):**

1. Go to: https://supabase.com/dashboard
2. Click your project
3. Click "SQL Editor" (left sidebar)
4. Click "New query"

5. **Run Migration 1:**
   - Open file: `supabase/migrations/001_create_mood_analyses.sql`
   - Copy ALL the SQL code
   - Paste into SQL Editor
   - Click "Run" (or press Ctrl+Enter)
   - Wait for "Success" message

6. **Run Migration 2:**
   - Open file: `supabase/migrations/002_create_mints_table.sql`
   - Copy ALL the SQL code
   - Paste into SQL Editor
   - Click "Run"
   - Wait for "Success" message

7. **Verify:**
   ```bash
   npm run db:verify
   ```
   Should show all tables exist ✅

## Step 2: Set Environment Variables on Server

Make sure these are set in your server's environment:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_MAINNET_GEN1_NFT_CONTRACT_ADDRESS`
- `REAL_WALLET`
- (And all other vars from `.env.example`)

## Step 3: Deploy

```bash
npm install
npm run build
npm start
```

## Step 4: Verify Everything Works

1. **Mint an NFT** - Check if it gets tracked in Supabase `mints` table
2. **Visit `/leaderboard`** - Should load from database
3. **Check logs** - No errors

## That's It! 🎉

You don't need the Supabase CLI. The Dashboard method works perfectly.

For detailed info, see `MIGRATION_INSTRUCTIONS.md`

