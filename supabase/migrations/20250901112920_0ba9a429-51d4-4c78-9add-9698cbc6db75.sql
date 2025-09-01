-- Golden Test: Create a test command with "ALWAYS prepend OK-" prompt
INSERT INTO user_commands (
  user_id, 
  name, 
  prompt, 
  system_prompt, 
  ai_model, 
  max_tokens, 
  temperature, 
  function_name, 
  icon, 
  category, 
  sort_order
) VALUES (
  (SELECT auth.uid()),
  'Golden Test Command',
  'ALWAYS prepend OK- to the beginning of your response, then process the text as requested.',
  'You are a test AI. You MUST ALWAYS start your response with OK- followed by the processed text.',
  'gpt-5-mini-2025-08-07',
  1000,
  0.3,
  'ai-light-edit',
  'TestTube',
  'test',
  999
) ON CONFLICT DO NOTHING;