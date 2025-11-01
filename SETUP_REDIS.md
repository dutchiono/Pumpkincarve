# Redis Setup Guide for Worker Queue

## Quick Setup for IONOS Server

### Step 1: SSH into Your Server

```bash
ssh your-username@your-ionos-server-ip
```

### Step 2: Install Redis

```bash
# Update package list
sudo apt update

# Install Redis
sudo apt install redis-server -y
```

### Step 3: Configure Redis

```bash
# Open Redis config
sudo nano /etc/redis/redis.conf
```

Find and update these lines:

```conf
# Find this line (around line 40)
supervised no

# Change to:
supervised systemd

# Find this line (around line 70)
# bind 127.0.0.1 ::1

# Ensure it's uncommented (for local-only access):
bind 127.0.0.1

# Find this line (add if missing, around line 550)
# maxmemory <bytes>

# Add:
maxmemory 256mb

# Find this line (add if missing, around line 560)
# maxmemory-policy noeviction

# Change to:
maxmemory-policy allkeys-lru
```

Save and exit: `Ctrl+X`, then `Y`, then `Enter`

### Step 4: Start and Enable Redis

```bash
# Start Redis
sudo systemctl start redis-server

# Enable auto-start on boot
sudo systemctl enable redis-server

# Check status
sudo systemctl status redis-server

# Test Redis
redis-cli ping
# Should return: PONG
```

If you see "PONG", Redis is working! ✅

### Step 5: Verify Configuration

```bash
# Test Redis is listening on port 6379
redis-cli info server | grep redis_version

# Check memory settings
redis-cli config get maxmemory

# Should show: maxmemory 268435456 (256MB in bytes)
```

### Step 6: Add Firewall Rule (Optional)

Redis is bound to localhost (127.0.0.1) by default, so it's only accessible from the server itself. This is secure for our use case since the app and worker run on the same server.

If you need external access (NOT recommended for production):

```bash
# Edit config to bind to public IP
sudo nano /etc/redis/redis.conf
# Change: bind 127.0.0.1 to bind 0.0.0.0
# Add password: requirepass your_secure_password

# Open firewall
sudo ufw allow 6379/tcp
sudo systemctl restart redis-server
```

**⚠️ Warning:** Never do this without a password!

### Alternative: Redis Cloud (If IONOS Setup Fails)

If installing Redis on IONOS causes issues:

1. Sign up at **redis.com/cloud** (free tier available)
2. Create a database
3. Get connection URL: `redis://default:password@endpoint:port`
4. Update `.env` with full URL instead of host/port

```bash
# In .env on server
REDIS_URL=redis://default:your_password@redis_endpoint:port
```

### Troubleshooting

**Issue:** `redis-cli: command not found`
```bash
# Redis not in PATH, use full path:
/usr/bin/redis-cli ping
```

**Issue:** `Connection refused`
```bash
# Redis not running
sudo systemctl start redis-server
sudo systemctl status redis-server
```

**Issue:** `Permission denied` on config file
```bash
# Use sudo
sudo nano /etc/redis/redis.conf
```

**Issue:** Redis won't start
```bash
# Check logs
sudo journalctl -u redis-server -n 50

# Common fix: Reset config
sudo systemctl stop redis-server
sudo cp /etc/redis/redis.conf /etc/redis/redis.conf.backup
# Edit config, then:
sudo systemctl start redis-server
```

### Verification Checklist

After setup, verify:

- [ ] `redis-cli ping` returns `PONG`
- [ ] `sudo systemctl status redis-server` shows "active (running)"
- [ ] Redis listening on port 6379: `sudo netstat -tlnp | grep 6379`
- [ ] Max memory set to 256mb: `redis-cli config get maxmemory`
- [ ] Eviction policy set: `redis-cli config get maxmemory-policy`

### Next Steps

1. ✅ Redis is now running
2. Add to `.env` on server:
   ```
   REDIS_HOST=127.0.0.1
   REDIS_PORT=6379
   ```
3. Install app dependencies: `npm install`
4. Start worker: `npm run worker`
5. Test queue system

### Useful Commands

```bash
# Start Redis
sudo systemctl start redis-server

# Stop Redis
sudo systemctl stop redis-server

# Restart Redis
sudo systemctl restart redis-server

# View Redis logs
sudo journalctl -u redis-server -f

# Redis CLI
redis-cli

# Inside redis-cli:
# PING - Check if running
# INFO - Get server info
# CONFIG GET maxmemory - Check memory limit
# FLUSHALL - Clear all data (careful!)
# EXIT - Leave redis-cli
```

### Monitoring

Watch Redis queue in real-time:
```bash
# Open Redis CLI
redis-cli

# Monitor commands
MONITOR

# In another terminal, queue a job and watch it appear
```

### Production Notes

- **Memory**: 256MB is plenty for job queues (<1MB per job)
- **Persistence**: Redis saves data to disk periodically (RDB snapshots)
- **Backup**: AOF (Append Only File) can be enabled for better durability
- **Monitoring**: Consider installing RedisInsight for web UI
- **Logs**: Redis logs to systemd journal by default

### Security

✅ Secure by default:
- Only listens on localhost (127.0.0.1)
- No password needed (internal use only)
- Isolated from external network

⚠️ If you must expose Redis:
- Set strong password in config
- Use firewall rules
- Enable TLS/SSL
- Monitor for attacks

### References

- Redis official docs: https://redis.io/docs/
- Redis configuration: https://redis.io/docs/management/config/
- Systemd integration: https://redis.io/docs/management/systemd/

### Need Help?

Common issues:
1. Redis won't install → Check apt update worked
2. Permission errors → Use sudo
3. Port already in use → `sudo lsof -i :6379` to find process
4. Config errors → Restore backup: `sudo cp /etc/redis/redis.conf.backup /etc/redis/redis.conf`

