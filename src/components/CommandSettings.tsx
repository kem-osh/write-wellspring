import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Trash, Save, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CommandSettingsProps {
  showSettings: boolean;
  onClose: () => void;
  onCommandsUpdated: () => void;
}

export interface CustomCommand {
  id: string;
  name: string;
  prompt: string;
  icon: string;
  model: 'gpt-5-nano-2025-08-07' | 'gpt-5-mini-2025-08-07';
  maxTokens: number;
  sortOrder: number;
}

const DEFAULT_COMMANDS: CustomCommand[] = [
  {
    id: 'light-edit',
    name: 'Light Edit',
    prompt: 'Fix spelling, grammar, and basic formatting. Preserve the author\'s voice and style completely. Make minimal changes.',
    icon: 'sparkles',
    model: 'gpt-5-nano-2025-08-07',
    maxTokens: 500,
    sortOrder: 1
  },
  {
    id: 'expand',
    name: 'Expand',
    prompt: 'Expand this content by 20-40% while maintaining the original tone. Add depth, examples, and supporting details.',
    icon: 'expand',
    model: 'gpt-5-mini-2025-08-07',
    maxTokens: 1500,
    sortOrder: 2
  },
  {
    id: 'condense',
    name: 'Condense',
    prompt: 'Reduce this content by 60-70% while preserving all key points and the author\'s voice.',
    icon: 'shrink',
    model: 'gpt-5-mini-2025-08-07',
    maxTokens: 800,
    sortOrder: 3
  },
  {
    id: 'outline',
    name: 'Outline',
    prompt: 'Create a structured outline with headers and bullet points based on this content.',
    icon: 'list',
    model: 'gpt-5-nano-2025-08-07',
    maxTokens: 500,
    sortOrder: 4
  }
];

export function CommandSettings({ showSettings, onClose, onCommandsUpdated }: CommandSettingsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [commands, setCommands] = useState<CustomCommand[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadCommands();
  }, [user]);

  const loadCommands = async () => {
    if (!user) return;

    // Load user's custom commands from localStorage
    const savedCommands = localStorage.getItem(`commands_${user.id}`);
    if (savedCommands) {
      setCommands(JSON.parse(savedCommands));
    } else {
      setCommands(DEFAULT_COMMANDS);
    }
  };

  const saveCommands = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem(`commands_${user.id}`, JSON.stringify(commands));
      
      onCommandsUpdated();
      
      toast({
        title: "Commands saved",
        description: "Your custom AI commands have been saved successfully.",
      });
      
      onClose();
    } catch (error) {
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
    const newCommand: CustomCommand = {
      id: `custom_${Date.now()}`,
      name: 'New Command',
      prompt: 'Enter your custom prompt here',
      icon: 'sparkles',
      model: 'gpt-5-nano-2025-08-07',
      maxTokens: 500,
      sortOrder: commands.length + 1
    };
    setCommands([...commands, newCommand]);
  };

  const updateCommand = (id: string, updates: Partial<CustomCommand>) => {
    setCommands(commands.map(cmd => 
      cmd.id === id ? { ...cmd, ...updates } : cmd
    ));
  };

  const deleteCommand = (id: string) => {
    if (commands.length <= 1) {
      toast({
        title: "Cannot delete",
        description: "You must have at least one command.",
        variant: "destructive",
      });
      return;
    }
    setCommands(commands.filter(cmd => cmd.id !== id));
  };

  const resetToDefaults = () => {
    if (confirm('Reset all commands to defaults? Your custom commands will be lost.')) {
      setCommands(DEFAULT_COMMANDS);
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
            {commands.map((command) => (
              <div key={command.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{command.name}</h4>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteCommand(command.id)}
                    disabled={commands.length <= 1}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Command Name</Label>
                    <Input
                      value={command.name}
                      onChange={(e) => updateCommand(command.id, { name: e.target.value })}
                      placeholder="e.g., Improve Clarity"
                    />
                  </div>

                  <div>
                    <Label>AI Model</Label>
                    <select
                      value={command.model}
                      onChange={(e) => updateCommand(command.id, { model: e.target.value as any })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                    >
                      <option value="gpt-5-nano-2025-08-07">GPT-5 Nano (Fastest, Cheapest)</option>
                      <option value="gpt-5-mini-2025-08-07">GPT-5 Mini (Better Quality)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label>System Prompt</Label>
                  <Textarea
                    value={command.prompt}
                    onChange={(e) => updateCommand(command.id, { prompt: e.target.value })}
                    placeholder="Enter the instruction for the AI..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Max Tokens</Label>
                    <Input
                      type="number"
                      value={command.maxTokens}
                      onChange={(e) => updateCommand(command.id, { maxTokens: parseInt(e.target.value) })}
                      min={50}
                      max={4000}
                    />
                  </div>

                  <div>
                    <Label>Sort Order</Label>
                    <Input
                      type="number"
                      value={command.sortOrder}
                      onChange={(e) => updateCommand(command.id, { sortOrder: parseInt(e.target.value) })}
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
              <Button onClick={resetToDefaults} variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Defaults
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