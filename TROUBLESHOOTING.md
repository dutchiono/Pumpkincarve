# Troubleshooting Supabase CLI Connection Issues

## Problem
The Supabase CLI hangs or fails to connect with:
```
failed to connect to postgres: failed to connect to `host=aws-1-us-east-1.pooler.supabase.com...`: hostname resolving error
```

## Solution: Use Dashboard Instead

The CLI connection issue is likely due to:
- Network/firewall blocking the connection
- DNS resolution issues
- Connection pooling timeout

**Good news:** You can use the Supabase Dashboard instead - it's actually easier!

## Quick Fix: Verify Tables in Dashboard

1. Go to: https://supabase.com/dashboard/project/ontpxscmpvcrgcdnjtda
2. Click "Table Editor" (left sidebar)
3. You should see these tables:
   - ✅ `mood_analyses`
   - ✅ `mints`
   - ✅ `transfers`
   - ✅ `admin_stats`
   - ✅ `notifications` (if migration 003 was pushed)

## If Notifications Table Missing

Just run the migration via Dashboard:

1. Go to **SQL Editor**
2. Copy/paste this SQL:
```sql
-- Add notifications table to store Farcaster notification tokens and URLs
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fid BIGINT NOT NULL UNIQUE,
  token TEXT,
  url TEXT,
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_fid ON notifications(fid);
CREATE INDEX IF NOT EXISTS idx_notifications_enabled ON notifications(enabled) WHERE enabled = true;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

3. Click **Run**

## Verify via Script

Run the verification script (uses Supabase client, not CLI):
```bash
npm run db:verify
```

This will check if all tables exist using the Supabase JavaScript client, which works even when CLI doesn't.

## Alternative: Check Connection Settings

If you want to fix the CLI issue:

1. Check your Supabase project settings
2. Try using the direct connection string instead of pooler
3. Or just use the Dashboard - it's more reliable for production anyway!

