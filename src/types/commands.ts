// Unified command interface for database-driven AI commands
export interface UnifiedCommand {
  // Database fields (matches user_commands table)
  id: string;
  user_id: string;
  name: string;
  prompt: string;
  ai_model: string;
  max_tokens: number;
  system_prompt: string;
  temperature?: number;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  
  // UI metadata fields (calculated/derived)
  function_name: string; // Maps to edge function name
  icon: string;
  category: 'edit' | 'structure' | 'analyze' | 'style' | 'custom';
  description: string;
  estimated_time: string;
}

// Default commands that will be inserted into database on "Restore Defaults"
export const DEFAULT_COMMANDS_TEMPLATE: Omit<UnifiedCommand, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [
  {
    name: 'Light Polish',
    prompt: 'Fix spelling, grammar, and basic punctuation. Preserve the author\'s voice and style completely. Make minimal changes.',
    system_prompt: 'You are an expert proofreader. Fix only spelling, grammar, and punctuation errors while preserving the author\'s voice completely.',
    ai_model: 'gpt-5-nano-2025-08-07',
    max_tokens: 500,
    temperature: 0.3,
    sort_order: 1,
    function_name: 'ai-light-edit',
    icon: 'sparkles',
    category: 'edit',
    description: 'Fix grammar, spelling, punctuation while preserving voice',
    estimated_time: '1-2s'
  },
  {
    name: 'Heavy Polish',
    prompt: 'Improve clarity, flow, and readability. Make style adjustments while preserving the author\'s voice. Enhance sentence structure and transitions.',
    system_prompt: 'You are an expert editor. Improve clarity, flow, and readability while preserving the author\'s unique voice and style.',
    ai_model: 'gpt-5-mini-2025-08-07',
    max_tokens: 1000,
    temperature: 0.3,
    sort_order: 2,
    function_name: 'ai-rewrite',
    icon: 'pen-tool',
    category: 'edit',
    description: 'Improve clarity, flow, and readability with style adjustments',
    estimated_time: '3-5s'
  },
  {
    name: 'Expand',
    prompt: 'Expand this content by 30-50% while maintaining the original tone. Add depth, examples, and supporting details.',
    system_prompt: 'You are an expert writer. Expand the content naturally by adding depth, examples, and supporting details while maintaining the original tone.',
    ai_model: 'gpt-5-mini-2025-08-07',
    max_tokens: 1500,
    temperature: 0.3,
    sort_order: 3,
    function_name: 'ai-expand-content',
    icon: 'expand',
    category: 'edit',
    description: 'Add 30-50% more content with examples and details',
    estimated_time: '4-6s'
  },
  {
    name: 'Condense',
    prompt: 'Reduce this content by 60% while preserving all key points and the author\'s voice.',
    system_prompt: 'You are an expert editor. Condense the content significantly while preserving all key points and the author\'s voice.',
    ai_model: 'gpt-5-mini-2025-08-07',
    max_tokens: 800,
    temperature: 0.3,
    sort_order: 4,
    function_name: 'ai-condense-content',
    icon: 'shrink',
    category: 'edit',
    description: 'Reduce by 60% while keeping all key points',
    estimated_time: '3-5s'
  },
  {
    name: 'Simplify',
    prompt: 'Rewrite for easier reading. Use shorter sentences, simpler words, and clearer structure. Target a general audience.',
    system_prompt: 'You are an expert at simplifying complex content. Rewrite using shorter sentences, simpler words, and clearer structure for a general audience.',
    ai_model: 'gpt-5-mini-2025-08-07',
    max_tokens: 1000,
    temperature: 0.3,
    sort_order: 5,
    function_name: 'ai-rewrite',
    icon: 'type',
    category: 'style',
    description: 'Make easier to read with simpler language',
    estimated_time: '3-5s'
  },
  {
    name: 'Outline',
    prompt: 'Create a structured outline with headers and bullet points based on this content.',
    system_prompt: 'You are an expert at creating structured outlines. Convert the content into a well-organized outline with headers and bullet points.',
    ai_model: 'gpt-5-nano-2025-08-07',
    max_tokens: 500,
    temperature: 0.3,
    sort_order: 6,
    function_name: 'ai-outline',
    icon: 'list',
    category: 'structure',
    description: 'Create structured outline with headers and bullets',
    estimated_time: '2-3s'
  },
  {
    name: 'Summarize',
    prompt: 'Extract the key points into a concise summary that is about 25% of the original length.',
    system_prompt: 'You are an expert at summarization. Extract and present the key points in a concise summary about 25% of the original length.',
    ai_model: 'gpt-5-mini-2025-08-07',
    max_tokens: 600,
    temperature: 0.3,
    sort_order: 7,
    function_name: 'ai-condense-content',
    icon: 'file-text',
    category: 'structure',
    description: 'Extract key points into 25% length summary',
    estimated_time: '3-4s'
  },
  {
    name: 'Bullet Points',
    prompt: 'Convert this content into clear, scannable bullet points that capture all main ideas.',
    system_prompt: 'You are an expert at organizing information. Convert the content into clear, scannable bullet points that capture all main ideas.',
    ai_model: 'gpt-5-nano-2025-08-07',
    max_tokens: 600,
    temperature: 0.3,
    sort_order: 8,
    function_name: 'ai-outline',
    icon: 'check-square',
    category: 'structure',
    description: 'Convert to clear, scannable bullet points',
    estimated_time: '2-3s'
  },
  {
    name: 'Analyze',
    prompt: 'Comprehensive analysis with improvement recommendations',
    system_prompt: 'You are an expert writing analyst. Provide comprehensive analysis of the content with specific, actionable improvement recommendations.',
    ai_model: 'gpt-5-mini-2025-08-07',
    max_tokens: 1200,
    temperature: 0.3,
    sort_order: 9,
    function_name: 'ai-analyze',
    icon: 'bar-chart-3',
    category: 'analyze',
    description: 'Get detailed analysis with actionable improvements',
    estimated_time: '5-8s'
  },
  {
    name: 'Formalize',
    prompt: 'Make this more professional and academic while keeping the core meaning intact.',
    system_prompt: 'You are an expert at academic and professional writing. Formalize the content to be more professional while keeping the core meaning intact.',
    ai_model: 'gpt-5-mini-2025-08-07',
    max_tokens: 1000,
    temperature: 0.3,
    sort_order: 10,
    function_name: 'ai-rewrite',
    icon: 'book-open',
    category: 'style',
    description: 'Make more professional and academic',
    estimated_time: '3-5s'
  },
  {
    name: 'Casualize',
    prompt: 'Make this more conversational and approachable while maintaining professionalism.',
    system_prompt: 'You are an expert at conversational writing. Make the content more conversational and approachable while maintaining professionalism.',
    ai_model: 'gpt-5-mini-2025-08-07',
    max_tokens: 1000,
    temperature: 0.3,
    sort_order: 11,
    function_name: 'ai-rewrite',
    icon: 'message-circle',
    category: 'style',
    description: 'Make more conversational and approachable',
    estimated_time: '3-5s'
  },
  {
    name: 'Continue',
    prompt: 'Continue writing from the provided text, seamlessly matching the existing tone and style.',
    system_prompt: 'You are an expert writer. Continue writing from where the text ends, seamlessly matching the existing tone, style, and flow.',
    ai_model: 'gpt-5-mini-2025-08-07',
    max_tokens: 1000,
    temperature: 0.3,
    sort_order: 12,
    function_name: 'ai-continue',
    icon: 'zap',
    category: 'edit',
    description: 'AI continues writing where you left off',
    estimated_time: '3-5s'
  },
  {
    name: 'Rewrite',
    prompt: 'Rewrite the following text to improve its clarity, engagement, and impact. Preserve the core meaning.',
    system_prompt: 'You are an expert rewriter. Completely rewrite the text to improve clarity, engagement, and impact while preserving the core meaning.',
    ai_model: 'gpt-5-mini-2025-08-07',
    max_tokens: 2000,
    temperature: 0.3,
    sort_order: 13,
    function_name: 'ai-rewrite',
    icon: 'pen-tool',
    category: 'edit',
    description: 'A complete rewrite of the selected text or document',
    estimated_time: '4-7s'
  },
  {
    name: 'Fact-Check',
    prompt: 'Analyze the following text for factual accuracy. Identify any claims and verify them. Return a summary of your findings.',
    system_prompt: 'You are a fact-checking assistant. Analyze the text for factual accuracy, identify claims, and provide verification with sources when possible.',
    ai_model: 'gpt-5-mini-2025-08-07',
    max_tokens: 1500,
    temperature: 0.3,
    sort_order: 14,
    function_name: 'ai-fact-check',
    icon: 'shield',
    category: 'analyze',
    description: 'Verify factual claims within the text',
    estimated_time: '6-10s'
  }
];

// Migration helper to move localStorage commands to database
export interface MigrationResult {
  migratedCount: number;
  errors: string[];
  existingCommands: UnifiedCommand[];
}