-- Add INSERT policy for ai_usage table to allow users to log their usage
CREATE POLICY "Users can insert their own usage" 
ON public.ai_usage 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create index on created_at for efficient rate limiting queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON public.ai_usage(created_at);

-- Create index on user_id + created_at for user-specific rate limiting
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_created ON public.ai_usage(user_id, created_at);