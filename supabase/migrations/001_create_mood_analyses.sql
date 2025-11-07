-- Create mood_analyses table to store AI mood analysis results
CREATE TABLE IF NOT EXISTS mood_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fid BIGINT,
  wallet_address TEXT,
  token_id BIGINT,
  mood TEXT,
  personality TEXT,
  traits JSONB,
  interests JSONB,
  reasoning TEXT,
  color1 TEXT,
  color2 TEXT,
  base_frequency NUMERIC,
  flow_field_base_frequency NUMERIC,
  flow_fields_base_frequency NUMERIC,
  flow_line_density NUMERIC,
  posts_analyzed INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_mood_analyses_fid ON mood_analyses(fid);
CREATE INDEX IF NOT EXISTS idx_mood_analyses_wallet_address ON mood_analyses(wallet_address);
CREATE INDEX IF NOT EXISTS idx_mood_analyses_token_id ON mood_analyses(token_id);
CREATE INDEX IF NOT EXISTS idx_mood_analyses_created_at ON mood_analyses(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_mood_analyses_updated_at
  BEFORE UPDATE ON mood_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

