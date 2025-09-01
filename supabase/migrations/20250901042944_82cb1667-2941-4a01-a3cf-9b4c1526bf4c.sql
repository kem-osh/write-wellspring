-- Add AI configuration columns to user_commands table
ALTER TABLE public.user_commands 
ADD COLUMN ai_model VARCHAR(100) DEFAULT 'gpt-5-mini-2025-08-07',
ADD COLUMN max_tokens INTEGER DEFAULT 2000,
ADD COLUMN temperature DECIMAL(3,2) DEFAULT 0.3,
ADD COLUMN system_prompt TEXT DEFAULT prompt;

-- Update the system_prompt column to use the existing prompt as default
UPDATE public.user_commands 
SET system_prompt = prompt 
WHERE system_prompt IS NULL;

-- Add command_name column for easier lookup (using existing name column as source)
ALTER TABLE public.user_commands 
ADD COLUMN command_name VARCHAR(100);

UPDATE public.user_commands 
SET command_name = name;