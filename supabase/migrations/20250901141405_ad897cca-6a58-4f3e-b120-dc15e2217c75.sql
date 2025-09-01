-- Add usage tracking to user_commands table
ALTER TABLE public.user_commands 
ADD COLUMN usage_count integer DEFAULT 0,
ADD COLUMN last_used_at timestamp with time zone,
ADD COLUMN description text;

-- Add index for efficient sorting by usage
CREATE INDEX idx_user_commands_usage ON public.user_commands(user_id, usage_count DESC);

-- Add index for category-based queries
CREATE INDEX idx_user_commands_category ON public.user_commands(user_id, category, usage_count DESC);