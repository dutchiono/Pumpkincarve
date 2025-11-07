-- Create mints table to track all NFT mints for leaderboard and admin tracking
CREATE TABLE IF NOT EXISTS mints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id BIGINT NOT NULL UNIQUE,
  minter_address TEXT NOT NULL,
  block_number BIGINT NOT NULL,
  transaction_hash TEXT NOT NULL UNIQUE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  image_url TEXT,
  metadata_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_mints_minter_address ON mints(minter_address);
CREATE INDEX IF NOT EXISTS idx_mints_token_id ON mints(token_id);
CREATE INDEX IF NOT EXISTS idx_mints_block_number ON mints(block_number);
CREATE INDEX IF NOT EXISTS idx_mints_timestamp ON mints(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mints_transaction_hash ON mints(transaction_hash);

-- Create transfers table to track NFT transfers (for gifters leaderboard)
CREATE TABLE IF NOT EXISTS transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id BIGINT NOT NULL,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  block_number BIGINT NOT NULL,
  transaction_hash TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_mint BOOLEAN DEFAULT FALSE, -- true if from_address is 0x0
  is_gift BOOLEAN DEFAULT FALSE, -- true if from_address != 0x0 and from_address != to_address
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for transfers
CREATE INDEX IF NOT EXISTS idx_transfers_token_id ON transfers(token_id);
CREATE INDEX IF NOT EXISTS idx_transfers_from_address ON transfers(from_address);
CREATE INDEX IF NOT EXISTS idx_transfers_to_address ON transfers(to_address);
CREATE INDEX IF NOT EXISTS idx_transfers_is_gift ON transfers(is_gift) WHERE is_gift = true;
CREATE INDEX IF NOT EXISTS idx_transfers_block_number ON transfers(block_number);
CREATE INDEX IF NOT EXISTS idx_transfers_transaction_hash ON transfers(transaction_hash);

-- Create admin_stats table to track admin data (total mints, current price, etc.)
CREATE TABLE IF NOT EXISTS admin_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for admin_stats
CREATE INDEX IF NOT EXISTS idx_admin_stats_key ON admin_stats(key);

-- Insert initial admin stats
INSERT INTO admin_stats (key, value) VALUES
  ('total_mints', '0'),
  ('current_mint_price_wei', '0'),
  ('last_price_update_block', '0'),
  ('price_update_threshold', '50'), -- Number of mints before price increase
  ('price_increase_percentage', '10') -- Percentage to increase price by (e.g., 10 = 10%)
ON CONFLICT (key) DO NOTHING;

-- Create function to increment admin stat (for total_mints counter)
CREATE OR REPLACE FUNCTION increment_admin_stat(stat_key TEXT)
RETURNS void AS $$
BEGIN
  UPDATE admin_stats
  SET value = (CAST(value AS INTEGER) + 1)::TEXT,
      updated_at = NOW()
  WHERE key = stat_key;
END;
$$ LANGUAGE plpgsql;

