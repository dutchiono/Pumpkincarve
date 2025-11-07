# Installing Supabase CLI on Windows

## Method 1: Using Scoop (Recommended for Windows)

Scoop is a Windows package manager. If you don't have it:

1. **Install Scoop:**
   ```powershell
   Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
   irm get.scoop.sh | iex
   ```

2. **Install Supabase CLI:**
   ```powershell
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase
   ```

3. **Verify:**
   ```powershell
   supabase --version
   ```

## Method 2: Using Chocolatey

If you have Chocolatey installed:

```powershell
choco install supabase
```

## Method 3: Download Binary Directly

1. **Download from GitHub:**
   - Go to: https://github.com/supabase/cli/releases/latest
   - Download: `supabase_windows_amd64.zip` (or appropriate for your system)

2. **Extract and add to PATH:**
   - Extract the zip file
   - Copy `supabase.exe` to a folder (e.g., `C:\tools\supabase\`)
   - Add that folder to your PATH environment variable

3. **Verify:**
   ```powershell
   supabase --version
   ```

## Method 4: Using npm (Alternative - npx)

Even though global install doesn't work, you can use npx:

```powershell
npx supabase@latest --version
```

Or create a wrapper script:
```powershell
# In package.json scripts:
"supabase": "npx supabase@latest"
```

Then use: `npm run supabase -- <command>`

## Quick Test

After installing, test it:

```powershell
supabase --version
supabase login
```

## Troubleshooting

### "supabase: command not found"
- Make sure the installation directory is in your PATH
- Restart PowerShell after adding to PATH
- Try: `refreshenv` (if using Chocolatey)

### "Access denied" errors
- Run PowerShell as Administrator
- Check your PATH variable: `$env:PATH`

### Still not working?
- Use Method 4 (npx) - it doesn't require installation
- Or just use the Dashboard method (it's easier anyway!)

