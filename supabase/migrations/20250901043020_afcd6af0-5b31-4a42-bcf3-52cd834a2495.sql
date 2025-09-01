-- Create user_commands table for AI command configurations
CREATE TABLE user_commands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  prompt TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  ai_model VARCHAR(100) DEFAULT 'gpt-5-mini-2025-08-07',
  max_tokens INTEGER DEFAULT 2000,
  temperature DECIMAL(3,2) DEFAULT 0.3,
  system_prompt TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_commands ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own commands" 
ON user_commands 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own commands" 
ON user_commands 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own commands" 
ON user_commands 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own commands" 
ON user_commands 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_commands_updated_at
BEFORE UPDATE ON user_commands
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();