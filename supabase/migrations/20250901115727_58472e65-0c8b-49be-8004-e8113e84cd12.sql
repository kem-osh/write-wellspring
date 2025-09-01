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
  '00000000-0000-0000-0000-000000000000'::uuid,
  'OK Test',
  'ALWAYS prepend TEST- to the beginning of your response',
  'You are a testing assistant. Always start responses with TEST-',
  'gpt-5-nano-2025-08-07',
  100,
  0.3,
  'ai-light-edit',
  'test-tube',
  'test',
  999
);