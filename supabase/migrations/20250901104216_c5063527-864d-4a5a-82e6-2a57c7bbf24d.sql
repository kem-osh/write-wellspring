-- Add missing columns to user_commands table
ALTER TABLE public.user_commands 
  ADD COLUMN IF NOT EXISTS function_name TEXT,
  ADD COLUMN IF NOT EXISTS icon TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT;

-- Backfill sensible defaults where null
UPDATE public.user_commands
SET function_name = COALESCE(function_name, 'ai-light-edit'),
    icon = COALESCE(icon, 'Sparkles'),
    category = COALESCE(category, 'edit')
WHERE function_name IS NULL OR icon IS NULL OR category IS NULL;

-- Update specific command mappings based on existing names
UPDATE public.user_commands
SET function_name = CASE 
    WHEN name = 'Light Polish' THEN 'ai-light-edit'
    WHEN name = 'Heavy Polish' THEN 'ai-rewrite'
    WHEN name = 'Expand Content' THEN 'ai-expand-content'
    WHEN name = 'Condense Content' THEN 'ai-condense-content'
    WHEN name = 'Create Outline' THEN 'ai-outline'
    WHEN name = 'Generate Title' THEN 'ai-generate-title'
    WHEN name = 'Continue Writing' THEN 'ai-continue'
    WHEN name = 'Analyze Text' THEN 'ai-analyze'
    WHEN name = 'Fact Check' THEN 'ai-fact-check'
    ELSE function_name
END,
icon = CASE 
    WHEN name = 'Light Polish' THEN 'Sparkles'
    WHEN name = 'Heavy Polish' THEN 'PenTool'
    WHEN name = 'Expand Content' THEN 'Expand'
    WHEN name = 'Condense Content' THEN 'Shrink'
    WHEN name = 'Create Outline' THEN 'List'
    WHEN name = 'Generate Title' THEN 'Type'
    WHEN name = 'Continue Writing' THEN 'Plus'
    WHEN name = 'Analyze Text' THEN 'Brain'
    WHEN name = 'Fact Check' THEN 'Shield'
    ELSE icon
END,
category = CASE 
    WHEN name IN ('Light Polish', 'Heavy Polish') THEN 'edit'
    WHEN name IN ('Expand Content', 'Condense Content', 'Create Outline', 'Generate Title', 'Continue Writing') THEN 'structure'
    WHEN name IN ('Analyze Text', 'Fact Check') THEN 'analyze'
    ELSE category
END;

-- Optional: Add constraints (commented out for flexibility)
-- ALTER TABLE public.user_commands ALTER COLUMN function_name SET NOT NULL;
-- ALTER TABLE public.user_commands ALTER COLUMN icon SET NOT NULL;  
-- ALTER TABLE public.user_commands ALTER COLUMN category SET NOT NULL;