# PM2 Setup - Fresh Start

## Delete Old PM2 Instances and Start Fresh

### Step 1: Delete All Existing PM2 Processes
```bash
# Stop all processes
pm2 stop all

# Delete all processes
pm2 delete all

# Verify they're gone
pm2 list
```

### Step 2: Start with Ecosystem Config
```bash
# Start both apps using ecosystem config
pm2 start ecosystem.config.cjs

# Save PM2 configuration
pm2 save

# Set up PM2 to start on reboot
pm2 startup
# (Follow the command it outputs)
```

### Step 3: Verify
```bash
# Check status
pm2 status

# Should see:
# - gen1-nextjs (running)
# - gen1-worker (running)

# View logs
pm2 logs
```

### Step 4: From Now On
Just run:
```bash
git pull
npm run build
pm2 restart all
```

## Commands Reference

```bash
pm2 status           # View status
pm2 logs             # View all logs
pm2 logs gen1-nextjs # View Next.js logs only
pm2 logs gen1-worker # View worker logs only
pm2 restart all      # Restart all apps
pm2 restart gen1-nextjs  # Restart Next.js only
pm2 restart gen1-worker  # Restart worker only
pm2 stop all         # Stop all
pm2 delete all       # Delete all
```

