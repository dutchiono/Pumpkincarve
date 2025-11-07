# Using Supabase CLI (Local Installation)

Since you installed Supabase as a dev dependency, use these commands:

## Quick Commands

```powershell
# Check version
npx supabase --version

# Link your project (first time only)
npm run db:link
# OR
npx supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
npm run db:push
# OR
npx supabase db push

# Pull current schema
npm run db:pull
# OR
npx supabase db pull
```

## First Time Setup

1. **Get your project ref:**
   - Go to https://supabase.com/dashboard
   - Click your project
   - In the URL: `https://supabase.com/dashboard/project/XXXXX`
   - The `XXXXX` is your project ref

2. **Link the project:**
   ```powershell
   npm run db:link
   ```
   Enter your project ref when prompted.

3. **Push migrations:**
   ```powershell
   npm run db:push
   ```

## All Available Commands

```powershell
npm run supabase -- <command>  # Run any supabase command
npm run db:push                 # Push migrations to Supabase
npm run db:pull                 # Pull schema from Supabase
npm run db:link                 # Link project
```

## Alternative: Use npx directly

```powershell
npx supabase <command>
```

Example:
```powershell
npx supabase login
npx supabase link --project-ref abc123
npx supabase db push
```

## Troubleshooting

### "Not linked to a project"
Run: `npm run db:link` first

### "Authentication required"
Run: `npx supabase login` first

### Still not working?
You can always use the Dashboard method - it's easier! Just copy/paste SQL files into the SQL Editor.

