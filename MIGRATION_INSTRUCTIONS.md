# Database Migration Instructions

## ✅ EASY METHOD: Use Supabase Dashboard (No CLI Needed!)

**Skip the CLI - just use the web dashboard. This is the easiest way.**

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run Migration 1**
   - Open `supabase/migrations/001_create_mood_analyses.sql`
   - Copy all the SQL
   - Paste into SQL Editor
   - Click "Run" (or press Ctrl+Enter)

4. **Run Migration 2**
   - Open `supabase/migrations/002_create_mints_table.sql`
   - Copy all the SQL
   - Paste into SQL Editor
   - Click "Run"

5. **Verify**
   ```bash
   npm run db:verify
   ```

### Option 2: Supabase CLI (NOT RECOMMENDED on Windows)

**Note:** Supabase CLI doesn't install via `npm install -g` on Windows.
**Just use Option 1 (Dashboard) instead - it's easier!**

If you really want CLI, see: https://github.com/supabase/cli#install-the-cli
But the Dashboard method works perfectly fine.

### Option 3: Direct PostgreSQL Connection

1. **Get Connection String**
   - Supabase Dashboard > Settings > Database
   - Copy "Connection string" (use "URI" format)
   - Use "Transaction" mode connection string

2. **Connect and Run**
   ```bash
   # Using psql (if installed)
   psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" -f supabase/migrations/001_create_mood_analyses.sql
   psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" -f supabase/migrations/002_create_mints_table.sql
   ```

   Or use any PostgreSQL client (pgAdmin, DBeaver, etc.) and run the SQL files.

## Verify Installation

After running migrations, verify tables exist:

```bash
npm run db:verify
```

Or manually check in Supabase Dashboard:
- Go to "Table Editor"
- You should see: `mood_analyses`, `mints`, `transfers`, `admin_stats`

## Troubleshooting

### "supabase: command not found"
- The Supabase CLI is not installed globally
- Use **Option 1 (Dashboard)** instead - it's easier and doesn't require CLI
- Or install CLI: `npm install -g supabase`

### "Table already exists" errors
- This is fine! The migrations are idempotent
- Tables were already created, you can skip

### Connection errors
- Verify your Supabase URL and keys in `.env`
- Check Supabase Dashboard > Settings > Database > Connection pooling
- Make sure your IP is allowed

### Migration files not found
- Make sure you're in the project root directory
- Check that `supabase/migrations/` folder exists
- Files should be:
  - `supabase/migrations/001_create_mood_analyses.sql`
  - `supabase/migrations/002_create_mints_table.sql`

## Recommended Approach

**For production/server deployment, use Option 1 (Dashboard):**
- No CLI installation needed
- Visual confirmation of SQL execution
- Easy to verify results
- Works from any machine

The CLI is nice for development, but the Dashboard method is more reliable for production deployments.

