# Gen1 NFT Scaling Architecture Documentation

## Problem Statement

The original Gen1 minting flow has critical scaling issues when multiple users try to mint simultaneously:

1. **Memory Exhaustion**: Each mint processes 10MB+ (2 uploads × 5MB GIFs)
2. **Pinata Rate Limits**: Free tier = 100 requests/month, paid has limits too
3. **No Request Queuing**: Concurrent uploads cause chaos
4. **Single-Threaded**: One slow request blocks everything
5. **Mobile Incompatibility**: Browser GIF.js doesn't work on mobile Safari

## Solution: Worker Queue System

Implemented a Redis-based worker queue using BullMQ to handle rendering and uploads asynchronously.

## Architecture Overview

```
User Browser                Next.js API              Redis Queue           Worker Process
    |                            |                         |                      |
    |-- Submit settings -------->|                         |                      |
    |                            |-- Add job ------------->|                      |
    |<-- Return jobId -----------|                         |                      |
    |                            |                         |                      |
    |                            |                         |<-- Pick job ---------|
    |-- Poll status ------------>|                         |                      |-- Render GIF
    |                            |-- Check status -------->|                      |
    |<-- Progress: 33% ----------|<------------------------|                      |
    |                                                       |                      |-- Upload IPFS
    |-- Poll status ------------>|                         |                      |
    |<-- Progress: 66% ----------|                         |                      |
    |                                                       |                      |-- Create metadata
    |-- Poll status ------------>|                         |                      |
    |<-- Completed + URLs -------|<-- Job complete --------|<---------------------|
    |                            |                         |                      |
    |-- Mint on-chain ---------> [Smart Contract]
```

## Components

### 1. Queue Service (`app/services/queue.ts`)

Redis connection and BullMQ queue configuration:

```typescript
import { Queue } from 'bullmq';
import Redis from 'ioredis';

export const nftRenderQueue = new Queue('nft-render', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100, // Keep last 100 jobs
    removeOnFail: 500,     // Keep last 500 failed jobs
  }
});
```

### 2. API Routes

**Queue Submission** (`app/api/gen1/queue-mint/route.ts`):
- Receives settings from client
- Adds job to Redis queue
- Returns job ID immediately

**Job Status** (`app/api/gen1/job-status/route.ts`):
- Polls job state from Redis
- Returns progress percentage
- Returns IPFS URLs when complete

### 3. Worker Process (`workers/nft-renderer.ts`)

Separate Node.js process that:
- Polls Redis for new jobs
- Renders GIF server-side (currently incomplete - see TODO)
- Uploads to IPFS
- Updates job progress
- Returns results to queue

**Status:** ⚠️ GIF encoding incomplete - returns PNG placeholder currently

### 4. Client Integration (`app/gen1-creator/Gen1App.tsx`)

Dual mint buttons:
- **Browser mint** (green): Original flow, works on desktop Chrome
- **Queue mint** (blue): New async flow, works on all devices

Queue mint flow:
1. Submit settings → get jobId
2. Poll status every 2 seconds
3. Show progress (0%, 33%, 66%, 100%)
4. When complete, mint on-chain
5. Show transaction hash

## Setup Instructions

### 1. Install Redis on IONOS Server

```bash
ssh your-user@your-ionos-server.com
sudo apt update
sudo apt install redis-server -y
```

Configure Redis:
```bash
sudo nano /etc/redis/redis.conf
```

Set these values:
```conf
supervised systemd
bind 127.0.0.1
maxmemory 256mb
maxmemory-policy allkeys-lru
```

Start Redis:
```bash
sudo systemctl start redis-server
sudo systemctl enable redis-server
redis-cli ping  # Should return PONG
```

### 2. Install Dependencies

```bash
npm install
```

New packages added:
- `bullmq` - Queue library
- `ioredis` - Redis client
- `canvas` - Server-side canvas
- `nodemon` - Worker dev server

### 3. Configure Environment

Add to `.env` on server:
```bash
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

### 4. Start Worker Process

Development:
```bash
npm run worker:dev
```

Production (PM2):
```bash
npm install -g pm2
pm2 start workers/start.js --name nft-worker
pm2 save
pm2 startup  # Auto-start on reboot
```

Check worker status:
```bash
pm2 logs nft-worker
pm2 status
```

### 5. Start Next.js App

```bash
npm run dev  # Development
npm run build && npm start  # Production
```

## Testing

### Manual Test

1. Start Redis: `sudo systemctl status redis-server`
2. Start worker: `npm run worker`
3. Start Next.js: `npm run dev`
4. Visit `http://localhost:3000/gen1-creator`
5. Click blue "Mint (Queue)" button
6. Watch console for job progress

### Load Test

```bash
# Install Apache Bench
sudo apt install apache2-utils

# Test with 5 concurrent requests
ab -n 5 -c 5 -p mint-request.json -T application/json \
   http://localhost:3000/api/gen1/queue-mint
```

Monitor Redis:
```bash
redis-cli LLEN bull:nft-render:wait  # Jobs waiting
redis-cli LLEN bull:nft-render:active # Jobs processing
```

## Current Limitations

### ⚠️ CRITICAL: Incomplete GIF Encoding

**Problem:** Worker renders frames but doesn't encode proper GIF.

**Current behavior:** Returns PNG buffer (placeholder).

**Required fix:** Add proper GIF encoding library:

**Option A: FFmpeg (Recommended)**
```bash
sudo apt install ffmpeg
```
```typescript
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

// Save frames as PNG files
// Then:
await execAsync(`ffmpeg -framerate 30 -i frame-%d.png output.gif`);
```

**Option B: Sharp + gifsicle**
```bash
npm install sharp gifsicle
```
More complex but lighter weight.

### Next Steps (from WORKER_QUEUE_TODO.md)

1. Choose GIF encoding solution
2. Update `workers/nft-renderer.ts` renderGIF function
3. Test locally before deploying
4. Monitor performance at scale

## Benefits Achieved

- ✅ Queue infrastructure in place
- ✅ Job submission and status polling working
- ✅ Client can choose browser or queue mint
- ✅ Progress tracking UI added
- ✅ Auto-retry on failures (3 attempts)
- ✅ Job history preserved (100 completed, 500 failed)
- ⚠️ Worker rendering incomplete (GIF encoding needed)

## Monitoring

### Check Queue Size
```bash
redis-cli LLEN bull:nft-render:wait
redis-cli LLEN bull:nft-render:active
redis-cli LLEN bull:nft-render:completed
```

### View Job Details
```bash
redis-cli GET bull:nft-render:JOB_ID
```

### Watch Worker Logs
```bash
pm2 logs nft-worker --lines 100
```

### Optional: Bull Board UI

Install dashboard:
```bash
npm install @bull-board/express @bull-board/api
```

Add to `app/admin/queues/page.tsx`:
```typescript
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(nftRenderQueue)],
  serverAdapter,
});
```

Access at: `http://localhost:3000/admin/queues`

## Production Checklist

- [ ] Redis installed and configured on server
- [ ] Worker process running with PM2
- [ ] GIF encoding implemented in worker
- [ ] Environment variables set on server
- [ ] Tested with 5+ concurrent users
- [ ] Monitor Pinata usage (upgrade tier if needed)
- [ ] Set up error alerts
- [ ] Back up Redis data regularly

## Estimated Capacity

**Current (Browser mint):**
- 1-2 users max
- Fails with 3+ concurrent

**With queue (after GIF encoding fix):**
- 10+ concurrent users
- Scales to 100+ with multiple workers
- No server crashes
- Graceful degradation under load

## Cost

**Infrastructure:**
- Redis: Free (self-hosted on IONOS)
- Worker: Free (uses existing server)
- Pinata: $20/month (paid tier, 1000 mints)

**Total: $20/month** for production scale

## Troubleshooting

**Redis not connecting:**
- Check: `redis-cli ping`
- Verify: `REDIS_HOST` and `REDIS_PORT` in `.env`
- Restart: `sudo systemctl restart redis-server`

**Worker not processing jobs:**
- Check: `pm2 logs nft-worker`
- Verify: Worker started with `npm run worker`
- Check: Queue has jobs: `redis-cli LLEN bull:nft-render:wait`

**GIF encoding failing:**
- See WORKER_QUEUE_TODO.md
- Install FFmpeg or gifsicle
- Update renderGIF function

**High memory usage:**
- Reduce worker concurrency: `concurrency: 2` or `1`
- Increase server RAM
- Enable swap: `sudo fallocate -l 2G /swapfile`

## References

- BullMQ docs: https://docs.bullmq.io/
- Redis docs: https://redis.io/docs/
- FFmpeg GIF encoding: https://gist.github.com/anonymous/c34d069c1504f4e0a9a8
- Sharp library: https://sharp.pixelplumbing.com/
- PM2 process manager: https://pm2.keymetrics.io/

