# Worker Queue Implementation - TODO

## Completed ✓

- [x] Install dependencies (bullmq, ioredis, canvas, nodemon)
- [x] Create `app/services/queue.ts` - Queue configuration
- [x] Create `app/api/gen1/queue-mint/route.ts` - Queue submission endpoint
- [x] Create `app/api/gen1/job-status/route.ts` - Job status polling endpoint
- [x] Create `workers/nft-renderer.ts` - Worker process skeleton
- [x] Create `workers/start.js` - Worker startup script
- [x] Update `package.json` with dependencies and scripts
- [x] Update `env.example` with Redis configuration
- [x] Update `app/api/gen1-image/route.ts` with caching

## In Progress 🚧

- [ ] Complete GIF encoding in `workers/nft-renderer.ts`
  - Currently returns PNG buffer (placeholder)
  - Need proper GIF library (sharp.js with gifsicle or gif.js for Node.js)
  - OR use FFmpeg via child_process

## Remaining Tasks

### Critical (Must Do)
- [ ] Fix GIF encoding in worker
  - Options:
    a) Use `sharp` with gifsicle (recommended)
    b) Use FFmpeg via exec
    c) Use browser gif.js via JSDOM (slow)
  - Current issue: canvas only exports PNG, needs proper GIF frames

- [ ] Update `app/gen1-creator/Gen1App.tsx` mint button
  - Replace direct render/upload with queue submission
  - Add progress polling UI
  - Keep existing mint button for now (dual mode)

### Setup (Manual on Server)
- [ ] SSH into IONOS server
- [ ] Install Redis: `sudo apt install redis-server`
- [ ] Configure Redis: `sudo nano /etc/redis/redis.conf`
  - Set `maxmemory 256mb`
  - Set `maxmemory-policy allkeys-lru`
- [ ] Start Redis: `sudo systemctl start redis-server`
- [ ] Test: `redis-cli ping` should return PONG
- [ ] Install dependencies: `npm install`
- [ ] Add Redis env vars to `.env` on server

### Testing
- [ ] Run worker locally: `npm run worker`
- [ ] Test queue-mint endpoint with curl
- [ ] Test job-status polling
- [ ] Load test with 5+ concurrent requests
- [ ] Monitor Redis queue size
- [ ] Verify GIFs are generated correctly

### Production Deployment
- [ ] Install PM2 on server: `npm install -g pm2`
- [ ] Start worker: `pm2 start workers/start.js --name nft-worker`
- [ ] Configure auto-start: `pm2 startup && pm2 save`
- [ ] Set up monitoring/logs
- [ ] Optional: Add Bull Board UI for queue dashboard

## Technical Notes

### GIF Encoding Issue

**Problem:** `canvas` library only exports PNG, not GIF. Need animation encoder.

**Solution Options:**

1. **Sharp + gifsicle** (Recommended)
   ```bash
   npm install sharp gifsicle
   ```
   ```typescript
   import sharp from 'sharp';
   import { execFile } from 'child_process';
   import { promisify } from 'util';

   const execFileAsync = promisify(execFile);

   // Generate PNG frames
   const pngBuffers = await Promise.all(frames.map(frame =>
     sharp(frame).png().toBuffer()
   ));

   // Save frames to temp directory
   // Use gifsicle to create animated GIF
   await execFileAsync('gifsicle', [
     '--delay', '33', // 30fps
     '--loop', '--frames',
     ...pngBuffers.map(b => `temp-frame-${idx}.png`)
   ]);
   ```

2. **FFmpeg** (Simpler, more common)
   ```bash
   sudo apt install ffmpeg
   ```
   ```typescript
   import { exec } from 'child_process';
   import { promisify } from 'util';
   const execAsync = promisify(exec);

   // Save frames
   // Then:
   await execAsync(`ffmpeg -framerate 30 -i frame-%d.png output.gif`);
   ```

3. **Browser gif.js + JSDOM** (Not recommended - slow)
   - Would need full DOM emulation
   - Much slower than native libraries

### Recommended Approach

For IONOS server, use FFmpeg (most reliable):
1. Install FFmpeg on server
2. Render frames as PNG files
3. Pipe to FFmpeg to create GIF
4. Clean up temp files

### Worker Process Updates Needed

Update `workers/nft-renderer.ts` `renderGIF` function:
- Render frames to PNG buffers
- Use FFmpeg or gifsicle to create animated GIF
- Return GIF buffer

## Architecture Overview

```
User Browser → /api/gen1/queue-mint → Redis Queue → Worker Process
                                         ↓
                                        Job Created
                                         ↓
                                        [Redis]
                                         ↓
Worker Polls → Renders GIF → Uploads IPFS → Returns URLs → Job Complete
                                         ↓
User Polls /api/gen1/job-status ← Job Result Stored in Redis
                                         ↓
User Mints On-Chain with IPFS URLs
```

## Files Created

- `app/services/queue.ts` - Queue configuration
- `app/api/gen1/queue-mint/route.ts` - Job submission
- `app/api/gen1/job-status/route.ts` - Status polling
- `workers/nft-renderer.ts` - Worker logic (incomplete GIF encoding)
- `workers/start.js` - Worker startup

## Files Modified

- `package.json` - Added bullmq, ioredis, canvas, nodemon
- `env.example` - Added Redis config

## Next Steps

1. Choose GIF encoding solution (FFmpeg recommended)
2. Update worker with proper GIF encoding
3. Test locally before deploying to server
4. Update client to use queue system
5. Deploy to IONOS

