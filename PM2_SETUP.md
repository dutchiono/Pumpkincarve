# PM2 Setup - Simple Ecosystem Config

## Quick Start

### First Time Setup
```bash
# Delete any old PM2 processes
pm2 stop all
pm2 delete all

# Start everything with ecosystem config (starts both Next.js app and worker)
pm2 start ecosystem.config.cjs

# Save PM2 configuration
pm2 save

# Set up PM2 to start on reboot (run the command it outputs)
pm2 startup
```

**Note:** After the first setup, you can control individual apps:
- `pm2 start gen1-nextjs` - Start Next.js app only
- `pm2 start gen1-worker` - Start worker only

### Daily Workflow
```bash
# After pulling and building
git pull
npm run build
pm2 restart all
```

## Using the Ecosystem Config

The `ecosystem.config.cjs` file defines both apps:
- `gen1-nextjs` - Next.js app
- `gen1-worker` - NFT rendering worker

### Start Everything
```bash
# Standard PM2 command (starts both apps from ecosystem.config.cjs)
pm2 start ecosystem.config.cjs

# OR use npm script (shorter):
npm run pm2:start
```

The ecosystem file (`ecosystem.config.cjs`) defines "Gen1" as both apps together. Running `pm2 start ecosystem.config.cjs` starts everything.

### Start Individual Apps (after ecosystem is loaded)
```bash
pm2 start gen1-nextjs    # Start Next.js only
pm2 start gen1-worker    # Start worker only
```

## Commands Reference

```bash
# Status & Logs
pm2 status                    # View status of all apps
pm2 logs                      # View all logs
pm2 logs gen1-nextjs          # View Next.js logs only
pm2 logs gen1-worker          # View worker logs only

# Control
pm2 restart all               # Restart all apps
pm2 restart gen1-nextjs       # Restart Next.js only
pm2 restart gen1-worker       # Restart worker only
pm2 stop all                  # Stop all apps
pm2 stop gen1-nextjs          # Stop Next.js only
pm2 stop gen1-worker          # Stop worker only
pm2 delete all                # Delete all apps from PM2

# Using npm scripts
npm run pm2:start             # Start ecosystem
npm run pm2:restart           # Restart ecosystem
npm run pm2:stop              # Stop ecosystem
npm run pm2:delete            # Delete ecosystem
npm run pm2:status            # View status
npm run pm2:logs              # View logs
```

## After First Setup

Once the ecosystem is loaded, you can control individual apps by name:
- `pm2 start gen1-nextjs` - Start Next.js app
- `pm2 start gen1-worker` - Start worker
- `pm2 restart gen1-nextjs` - Restart Next.js app
- `pm2 restart gen1-worker` - Restart worker

