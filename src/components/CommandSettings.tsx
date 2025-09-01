import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Trash, Save, RotateCcw } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedCommand } from '@/types/commands';
import { restoreDefaultCommands } from '@/utils/commandMigration';
import { makeNewCommand } from '@/utils/newCommand';

// Function name options for edge functions
const FUNCTION_OPTIONS = [
  { value: 'ai-light-edit', label: 'Light Edit' },
  { value: 'ai-rewrite', label: 'Rewrite' },
  { value: 'ai-expand-content', label: 'Expand Content' },
  { value: 'ai-condense-content', label: 'Condense Content' },
  { value: 'ai-outline', label: 'Create Outline' },
  { value: 'ai-continue', label: 'Continue Writing' },
  { value: 'ai-analyze', label: 'Analyze Text' },
  { value: 'ai-fact-check', label: 'Fact Check' },
  { value: 'ai-generate-title', label: 'Generate Title' },
  { value: 'ai-translate', label: 'Translate' },
];

// Category options
const CATEGORY_OPTIONS = [
  { value: 'edit', label: 'Edit' },
  { value: 'structure', label: 'Structure' },
  { value: 'analyze', label: 'Analyze' },
  { value: 'style', label: 'Style' },
  { value: 'utility', label: 'Utility' },
];

// Common Lucide icon options
const ICON_OPTIONS = [
  'Sparkles', 'PenTool', 'Expand', 'Shrink', 'List', 'Type', 'Plus', 'Brain', 
  'Shield', 'FileText', 'CheckSquare', 'BarChart3', 'BookOpen', 'MessageCircle',
  'Hash', 'Palette', 'Target', 'Zap', 'Languages', 'Globe', 'Eye', 'Settings'
];

// Icon preview component
function IconPreview({ name }: { name?: string }) {
  const IconComponent = (name && (Icons as any)[name]) || Icons.Sparkles;
  return <IconComponent className="h-4 w-4" />;
}

interface CommandSettingsProps {
  showSettings: boolean;
  onClose: () => void;
  onCommandsUpdated: () => void;
}

export function CommandSettings({ showSettings, onClose, onCommandsUpdated }: CommandSettingsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [commands, setCommands] = useState<UnifiedCommand[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    loadCommands();
  }, [user]);

  const loadCommands = async () => {
    if (!user) return;

    try {
      // Use type assertion to work around TypeScript limitations
      const { data, error } = await (supabase as any)
        .from('user_commands')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order');

      if (error) throw error;
      
      if (data && data.length > 0) {
        // Direct mapping from DB - no more hardcoded logic
        const unifiedCommands: UnifiedCommand[] = data.map((cmd: any) => ({
          ...cmd,
          description: cmd.description || cmd.prompt?.substring(0, 50) + '...' || 'Custom command',
          estimated_time: cmd.estimated_time || '3-5s'
        }));
        setCommands(unifiedCommands);
      } else {
        // No commands found - let user manually restore if desired
        setCommands([]);
        console.log('No commands found for user - showing empty state');
      }
    } catch (error) {
      console.error('Error loading commands:', error);
      toast({
        title: "Load failed",
        description: "Failed to load your commands. Please try again.",
        variant: "destructive",
      });
    }
  };

  const saveCommands = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      // Update existing commands
      for (const command of commands) {
        if (command.id) {
          const { error } = await (supabase as any)
            .from('user_commands')
            .update({
              name: command.name,
              prompt: command.prompt,
              system_prompt: command.system_prompt,
              function_name: command.function_name,
              icon: command.icon,
              category: command.category,
              ai_model: command.ai_model,
              max_tokens: command.max_tokens,
              temperature: command.temperature,
              sort_order: command.sort_order,
              updated_at: new Date().toISOString()
            })
            .eq('id', command.id)
            .eq('user_id', user.id);

          if (error) throw error;
        } else {
          // Insert new command
          const { error } = await (supabase as any)
            .from('user_commands')
            .insert({
              name: command.name,
              prompt: command.prompt,
              system_prompt: command.system_prompt,
              function_name: command.function_name,
              icon: command.icon,
              category: command.category,
              ai_model: command.ai_model,
              max_tokens: command.max_tokens,
              temperature: command.temperature,
              sort_order: command.sort_order,
              user_id: user.id
            });

          if (error) throw error;
        }
      }
      
      onCommandsUpdated();
      
      toast({
        title: "Commands saved",
        description: "Your custom AI commands have been saved successfully.",
      });
      
      onClose();
    } catch (error) {
      console.error('Error saving commands:', error);
      toast({
        title: "Save failed",
        description: "Failed to save your commands. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addCommand = () => {
    const sortOrder = Math.max(...commands.map(c => c.sort_order), 0) + 1;
    const newCommand = makeNewCommand(user!.id, sortOrder);
    setCommands([...commands, newCommand]);
  };

  const updateCommand = (index: number, updates: Partial<UnifiedCommand>) => {
    const updatedCommands = [...commands];
    updatedCommands[index] = { ...updatedCommands[index], ...updates };
    setCommands(updatedCommands);
  };

  const deleteCommand = async (index: number) => {
    if (commands.length <= 1) {
      toast({
        title: "Cannot delete",
        description: "You must have at least one command.",
        variant: "destructive",
      });
      return;
    }

    const command = commands[index];
    
    try {
      // If command has an ID, delete from database
      if (command.id) {
        const { error } = await (supabase as any)
          .from('user_commands')
          .delete()
          .eq('id', command.id)
          .eq('user_id', user!.id);

        if (error) throw error;
      }
      
      // Remove from local state
      setCommands(commands.filter((_, i) => i !== index));
      
      toast({
        title: "Command deleted",
        description: "The command has been removed.",
      });
    } catch (error) {
      console.error('Error deleting command:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete the command. Please try again.",
        variant: "destructive",
      });
    }
  };

  const resetToDefaults = async () => {
    if (!confirm('Reset all commands to defaults? Your custom commands will be lost.')) {
      return;
    }

    setIsResetting(true);
    try {
      await restoreDefaultCommands(user!.id);
      await loadCommands();
      
      toast({
        title: "Commands reset",
        description: "All commands have been reset to defaults.",
      });
    } catch (error) {
      console.error('Error resetting commands:', error);
      toast({
        title: "Reset failed",
        description: "Failed to reset commands. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Dialog open={showSettings} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customize AI Commands</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Edit the prompts and settings for your AI writing commands. These will appear in the toolbar.
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Command List */}
          <div className="space-y-4">
            {commands.map((command, index) => (
              <div key={command.id || index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{command.name}</h4>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteCommand(index)}
                    disabled={commands.length <= 1}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Command Name</Label>
                    <Input
                      value={command.name}
                      onChange={(e) => updateCommand(index, { name: e.target.value })}
                      placeholder="e.g., Improve Clarity"
                    />
                  </div>

                  <div>
                    <Label>Function Name</Label>
                    <Select
                      value={command.function_name || 'ai-light-edit'}
                      onValueChange={(value) => updateCommand(index, { function_name: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FUNCTION_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>AI Model</Label>
                    <select
                      value={command.ai_model}
                      onChange={(e) => updateCommand(index, { ai_model: e.target.value as any })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                    >
                      <option value="gpt-5-nano-2025-08-07">GPT-5 Nano (Fastest, Cheapest)</option>
                      <option value="gpt-5-mini-2025-08-07">GPT-5 Mini (Better Quality)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Icon</Label>
                    <Select
                      value={command.icon || 'Sparkles'}
                      onValueChange={(value) => updateCommand(index, { icon: value })}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          <div className="flex items-center gap-2">
                            <IconPreview name={command.icon} />
                            <span>{command.icon || 'Sparkles'}</span>
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {ICON_OPTIONS.map((iconName) => (
                          <SelectItem key={iconName} value={iconName}>
                            <div className="flex items-center gap-2">
                              <IconPreview name={iconName} />
                              <span>{iconName}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Category</Label>
                    <Select
                      value={command.category || 'edit'}
                      onValueChange={(value) => updateCommand(index, { category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>User Prompt</Label>
                  <Textarea
                    value={command.prompt}
                    onChange={(e) => updateCommand(index, { prompt: e.target.value })}
                    placeholder="Enter the user-facing description..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label>System Prompt</Label>
                  <Textarea
                    value={command.system_prompt}
                    onChange={(e) => updateCommand(index, { system_prompt: e.target.value })}
                    placeholder="Enter the instruction for the AI..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Max Tokens</Label>
                    <Input
                      type="number"
                      value={command.max_tokens}
                      onChange={(e) => updateCommand(index, { max_tokens: parseInt(e.target.value) })}
                      min={50}
                      max={4000}
                    />
                  </div>

                  <div>
                    <Label>Temperature</Label>
                    <Input
                      type="number"
                      value={command.temperature}
                      onChange={(e) => updateCommand(index, { temperature: parseFloat(e.target.value) })}
                      min={0}
                      max={1}
                      step={0.1}
                    />
                  </div>

                  <div>
                    <Label>Sort Order</Label>
                    <Input
                      type="number"
                      value={command.sort_order}
                      onChange={(e) => updateCommand(index, { sort_order: parseInt(e.target.value) })}
                      min={1}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <div className="space-x-2">
              <Button onClick={addCommand} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Command
              </Button>
              <Button onClick={resetToDefaults} variant="outline" disabled={isResetting}>
                <RotateCcw className="h-4 w-4 mr-2" />
                {isResetting ? 'Resetting...' : 'Reset to Defaults'}
              </Button>
            </div>

            <div className="space-x-2">
              <Button onClick={onClose} variant="outline">
                Cancel
              </Button>
              <Button onClick={saveCommands} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Commands'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}