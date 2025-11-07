# Supabase Database Setup

This directory contains database migrations for the Gen1 NFT Studio application.

## Migration Files

1. **001_create_mood_analyses.sql** - Creates the `mood_analyses` table for storing AI mood analysis results
2. **002_create_mints_table.sql** - Creates `mints`, `transfers`, and `admin_stats` tables for mint tracking and leaderboard

## Setup Instructions

### Method 1: Supabase Dashboard (Easiest)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of each migration file
4. Paste into the SQL Editor and click **Run**
5. Run migrations in order (001 first, then 002)

### Method 2: Supabase CLI (Recommended for Development)

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```
   (Find your project ref in your Supabase dashboard URL)

4. Push migrations:
   ```bash
   supabase db push
   ```

### Method 3: Manual SQL Execution

1. Connect to your Supabase database using any PostgreSQL client (pgAdmin, DBeaver, etc.)
2. Get your connection string from Supabase Dashboard > Settings > Database > Connection string
3. Run each migration file in order

### Method 4: Using psql (Command Line)

1. Get your database connection string from Supabase Dashboard
2. Run:
   ```bash
   psql "your-connection-string" -f supabase/migrations/001_create_mood_analyses.sql
   psql "your-connection-string" -f supabase/migrations/002_create_mints_table.sql
   ```

## Verification

After running migrations, verify the tables exist:

```sql
-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('mood_analyses', 'mints', 'transfers', 'admin_stats');

-- Check table structures
\d mood_analyses
\d mints
\d transfers
\d admin_stats
```

Or use the setup script:

```bash
node scripts/setup-database.cjs
```

## Tables Created

### mood_analyses
Stores AI mood analysis results from Farcaster user posts.

### mints
Tracks all NFT mints (token_id, minter_address, block_number, transaction_hash).

### transfers
Tracks all NFT transfers for gifters leaderboard (from_address, to_address, is_mint, is_gift flags).

### admin_stats
Stores admin configuration (total_mints, current_mint_price_wei, price_update_threshold, price_increase_percentage).

## Environment Variables

Make sure these are set in your `.env` file:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Troubleshooting

### Tables already exist
If you get "table already exists" errors, that's okay - the migrations are idempotent. You can safely ignore these errors.

### Permission errors
Make sure you're using the `SUPABASE_SERVICE_ROLE_KEY` (not the anon key) for migrations. The service role key has full database access.

### Connection errors
- Verify your Supabase URL is correct
- Check that your IP is allowed in Supabase Dashboard > Settings > Database > Connection pooling
- For production, use connection pooling: `https://your-project.supabase.co:6543`

