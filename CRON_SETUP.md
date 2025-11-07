# Cron Job Setup for Price Automation

## Quick Setup

### Option 1: Use the setup script (easiest)
```bash
chmod +x scripts/setup-cron.sh
./scripts/setup-cron.sh
```

This sets up a cron job to run every 10 minutes.

### Option 2: Manual setup

1. **Edit crontab:**
   ```bash
   crontab -e
   ```

2. **Add this line:**
   ```bash
   # Run price adjustment every 10 minutes
   */10 * * * * cd /path/to/pumpkin-carving-nft && node scripts/auto-adjust-mint-price.cjs >> /var/log/gen1-nft/price-adjust.log 2>&1
   ```

3. **Replace `/path/to/pumpkin-carving-nft`** with your actual project directory path.

## Schedule Options

- **Every 10 minutes:** `*/10 * * * *`
- **Every 5 minutes:** `*/5 * * * *`
- **Every hour:** `0 * * * *`
- **Every 30 minutes:** `*/30 * * * *`

## View Logs

```bash
# View recent logs
tail -f /var/log/gen1-nft/price-adjust.log

# View last 50 lines
tail -n 50 /var/log/gen1-nft/price-adjust.log
```

## Verify Cron Job

```bash
# List all cron jobs
crontab -l

# Check if cron is running
systemctl status cron  # Ubuntu/Debian
systemctl status crond  # CentOS/RHEL
```

## Remove Cron Job

```bash
crontab -e
# Delete the line for auto-adjust-mint-price
```

Or:
```bash
crontab -l | grep -v 'auto-adjust-mint-price' | crontab -
```

## Notes

- The script checks total mints from Supabase
- Only raises price if threshold is reached (default: every 50 mints)
- Requires `SUPABASE_SERVICE_ROLE_KEY` and contract owner wallet
- Make sure the script has execute permissions: `chmod +x scripts/auto-adjust-mint-price.cjs`

