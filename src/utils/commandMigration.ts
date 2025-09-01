import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_COMMANDS_TEMPLATE, UnifiedCommand, MigrationResult } from '@/types/commands';

/**
 * Migrates localStorage commands to Supabase database
 * This is a one-time migration helper for existing users
 */
export async function migrateLocalStorageToDatabase(userId: string): Promise<MigrationResult> {
  const result: MigrationResult = {
    migratedCount: 0,
    errors: [],
    existingCommands: []
  };

  try {
    // Check if user already has commands in database
    const { data: existingCommands, error: fetchError } = await (supabase as any)
      .from('user_commands')
      .select('*')
      .eq('user_id', userId);

    if (fetchError) {
      result.errors.push(`Failed to fetch existing commands: ${fetchError.message}`);
      return result;
    }

    result.existingCommands = (existingCommands || []) as UnifiedCommand[];

    // If user already has commands in database, skip migration
    if (existingCommands && existingCommands.length > 0) {
      console.log('User already has commands in database, skipping migration');
      return result;
    }

    // Check for localStorage commands
    const localStorageKey = `commands_${userId}`;
    const savedCommands = localStorage.getItem(localStorageKey);
    
    let commandsToMigrate: any[] = [];
    
    if (savedCommands) {
      try {
        const parsedCommands = JSON.parse(savedCommands);
        console.log('Found localStorage commands to migrate:', parsedCommands.length);
        commandsToMigrate = parsedCommands;
      } catch (parseError) {
        result.errors.push('Failed to parse localStorage commands');
        console.error('Parse error:', parseError);
      }
    }

    // If no localStorage commands, use defaults
    if (commandsToMigrate.length === 0) {
      console.log('No localStorage commands found, will use defaults');
      commandsToMigrate = DEFAULT_COMMANDS_TEMPLATE.map(cmd => ({
        ...cmd,
        id: `default_${cmd.sort_order}` // Temporary ID for mapping
      }));
    }

    // Convert commands to database format
    const dbCommands = commandsToMigrate.map((cmd, index) => {
      // Find matching default command for metadata
      const defaultMatch = DEFAULT_COMMANDS_TEMPLATE.find(
        def => def.name === cmd.name || 
               def.function_name === cmd.function_name ||
               def.function_name === getFunctionNameFromCommand(cmd)
      );

      return {
        user_id: userId,
        name: cmd.name || 'Untitled Command',
        prompt: cmd.prompt || '',
        ai_model: cmd.model || cmd.ai_model || 'gpt-5-mini-2025-08-07',
        max_tokens: cmd.maxTokens || cmd.max_tokens || 1000,
        system_prompt: cmd.system_prompt || cmd.prompt || '',
        temperature: cmd.temperature || 0.3,
        sort_order: cmd.sortOrder || cmd.sort_order || index + 1,
        function_name: cmd.function_name || defaultMatch?.function_name || 'ai-light-edit',
        icon: cmd.icon || defaultMatch?.icon || 'sparkles',
        category: cmd.category || defaultMatch?.category || 'edit'
      };
    });

    // Insert commands into database
    const { data: insertedCommands, error: insertError } = await (supabase as any)
      .from('user_commands')
      .insert(dbCommands)
      .select();

    if (insertError) {
      result.errors.push(`Failed to insert commands: ${insertError.message}`);
      return result;
    }

    result.migratedCount = insertedCommands?.length || 0;
    console.log(`Successfully migrated ${result.migratedCount} commands to database`);

    // Clean up localStorage after successful migration
    if (savedCommands && result.migratedCount > 0) {
      localStorage.removeItem(localStorageKey);
      console.log('Removed localStorage commands after successful migration');
    }

    return result;

  } catch (error) {
    console.error('Migration error:', error);
    result.errors.push(error instanceof Error ? error.message : 'Unknown migration error');
    return result;
  }
}

/**
 * Loads user commands from database, handling migration if needed
 */
export async function loadUserCommands(userId: string): Promise<UnifiedCommand[]> {
  try {
    // First try to migrate localStorage if needed
    await migrateLocalStorageToDatabase(userId);

    // Load commands from database
    const { data: dbCommands, error } = await (supabase as any)
      .from('user_commands')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order');

    if (error) {
      console.error('Error loading user commands:', error);
      return [];
    }

    if (!dbCommands || dbCommands.length === 0) {
      console.log('No commands found, user needs to restore defaults');
      return [];
    }

    // Convert database commands to UnifiedCommand format with UI metadata
    const unifiedCommands: UnifiedCommand[] = (dbCommands || []).map((cmd: any) => {
      // Find matching default command for UI metadata
      const defaultMatch = DEFAULT_COMMANDS_TEMPLATE.find(
        def => def.name === cmd.name || def.function_name === getFunctionNameFromCommand(cmd)
      );

      return {
        ...cmd,
        function_name: defaultMatch?.function_name || 'ai-light-edit',
        icon: defaultMatch?.icon || 'sparkles',
        category: defaultMatch?.category || 'edit',
        description: defaultMatch?.description || cmd.prompt?.substring(0, 50) + '...' || 'Custom command',
        estimated_time: defaultMatch?.estimated_time || '2-4s'
      } as UnifiedCommand;
    });

    return unifiedCommands;

  } catch (error) {
    console.error('Error in loadUserCommands:', error);
    return [];
  }
}

/**
 * Restores default commands for a user (used by "Restore Defaults" button)
 */
export async function restoreDefaultCommands(userId: string): Promise<{ success: boolean; error?: string; commandCount?: number }> {
  try {
    // First, check if user already has commands
    const { data: existingCommands } = await (supabase as any)
      .from('user_commands')
      .select('id')
      .eq('user_id', userId);

    // Delete existing commands if any
    if (existingCommands && existingCommands.length > 0) {
      const { error: deleteError } = await (supabase as any)
        .from('user_commands')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        return { success: false, error: `Failed to delete existing commands: ${deleteError.message}` };
      }
    }

    // Insert default commands
    const defaultCommands = DEFAULT_COMMANDS_TEMPLATE.map(cmd => ({
      user_id: userId,
      name: cmd.name,
      prompt: cmd.prompt,
      ai_model: cmd.ai_model,
      max_tokens: cmd.max_tokens,
      system_prompt: cmd.system_prompt,
      temperature: cmd.temperature,
      sort_order: cmd.sort_order,
      function_name: cmd.function_name,
      icon: cmd.icon,
      category: cmd.category
    }));

    const { data: insertedCommands, error: insertError } = await (supabase as any)
      .from('user_commands')
      .insert(defaultCommands)
      .select();

    if (insertError) {
      return { success: false, error: `Failed to insert default commands: ${insertError.message}` };
    }

    return { 
      success: true, 
      commandCount: insertedCommands?.length || 0 
    };

  } catch (error) {
    console.error('Error restoring default commands:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Helper to determine function name from command properties
 */
function getFunctionNameFromCommand(cmd: any): string {
  // Try to infer function name from command properties
  const name = cmd.name?.toLowerCase() || '';
  const prompt = cmd.prompt?.toLowerCase() || '';

  if (name.includes('polish') && name.includes('light')) return 'ai-light-edit';
  if (name.includes('expand')) return 'ai-expand-content';
  if (name.includes('condense') || name.includes('summarize')) return 'ai-condense-content';
  if (name.includes('outline') || name.includes('bullet')) return 'ai-outline';
  if (name.includes('continue')) return 'ai-continue';
  if (name.includes('fact') && name.includes('check')) return 'ai-fact-check';
  if (name.includes('analyze')) return 'ai-analyze';
  if (name.includes('rewrite') || name.includes('polish') || name.includes('formal') || name.includes('casual') || name.includes('simplify')) return 'ai-rewrite';

  // Default fallback
  return 'ai-light-edit';
}