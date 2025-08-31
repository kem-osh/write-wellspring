-- Create basic performance indexes (without the memory-intensive vector index)
CREATE INDEX IF NOT EXISTS idx_documents_user_updated 
ON documents (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_documents_user_status 
ON documents (user_id, status);

CREATE INDEX IF NOT EXISTS idx_documents_user_category 
ON documents (user_id, category);

-- Create AI usage tracking table for cost monitoring
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  function_name TEXT NOT NULL,
  model TEXT,
  tokens_input INTEGER,
  tokens_output INTEGER,
  cost_estimate DECIMAL(10, 6),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add RLS policies for usage tracking
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage" 
ON ai_usage FOR SELECT 
USING (auth.uid() = user_id);

-- Index for usage queries
CREATE INDEX idx_ai_usage_user_created 
ON ai_usage (user_id, created_at DESC);

-- Update table statistics
ANALYZE documents;