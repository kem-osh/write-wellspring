import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSettingsStore, Settings } from '@/stores/settingsStore';
import { CommandSettings } from '@/components/CommandSettings';
import { RotateCcw, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { settings, updateSetting, resetSettings } = useSettingsStore();
  const { toast } = useToast();
  const [showCommandSettings, setShowCommandSettings] = useState(false);

  const handleReset = () => {
    resetSettings();
    toast({
      title: 'Settings Reset',
      description: 'All settings have been restored to defaults.',
    });
  };

  const fontSizeOptions = [
    { value: 12, label: '12px - Small' },
    { value: 14, label: '14px - Default' },
    { value: 16, label: '16px - Medium' },
    { value: 18, label: '18px - Large' },
    { value: 20, label: '20px - Extra Large' },
    { value: 24, label: '24px - Maximum' },
  ];

  const autoSaveOptions = [
    { value: 5000, label: '5 seconds' },
    { value: 10000, label: '10 seconds' },
    { value: 30000, label: '30 seconds' },
    { value: 60000, label: '1 minute' },
    { value: 0, label: 'Manual only' },
  ];

  const languageOptions = [
    { value: 'en-US', label: 'English (US)' },
    { value: 'en-GB', label: 'English (UK)' },
    { value: 'es-ES', label: 'Spanish' },
    { value: 'fr-FR', label: 'French' },
    { value: 'de-DE', label: 'German' },
    { value: 'it-IT', label: 'Italian' },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Settings
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="h-8"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="editor">Editor</TabsTrigger>
              <TabsTrigger value="ai">AI</TabsTrigger>
            </TabsList>

            <div className="max-h-[60vh] overflow-y-auto">
              <TabsContent value="general" className="space-y-6 px-1">
                <div className="space-y-2">
                  <Label htmlFor="autosave">Auto-Save Interval</Label>
                  <Select
                    value={settings.autoSaveInterval.toString()}
                    onValueChange={(value) => updateSetting('autoSaveInterval', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {autoSaveOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Default Document Category</Label>
                  <Select
                    value={settings.defaultCategory}
                    onValueChange={(value) => updateSetting('defaultCategory', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="blog">Blog</SelectItem>
                      <SelectItem value="book">Book</SelectItem>
                      <SelectItem value="essay">Essay</SelectItem>
                      <SelectItem value="notes">Notes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="autotitle">Auto-Generate Titles</Label>
                  <Switch
                    id="autotitle"
                    checked={settings.autoGenerateTitles}
                    onCheckedChange={(checked) => updateSetting('autoGenerateTitles', checked)}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Export Format</Label>
                  <RadioGroup
                    value={settings.exportFormat}
                    onValueChange={(value) => updateSetting('exportFormat', value as Settings['exportFormat'])}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="txt" id="txt" />
                      <Label htmlFor="txt">Plain Text</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="md" id="md" />
                      <Label htmlFor="md">Markdown</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="docx" id="docx" />
                      <Label htmlFor="docx">Word Document</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pdf" id="pdf" />
                      <Label htmlFor="pdf">PDF</Label>
                    </div>
                  </RadioGroup>
                </div>
              </TabsContent>

              <TabsContent value="editor" className="space-y-6 px-1">
                <div className="space-y-3">
                  <Label>Theme</Label>
                  <RadioGroup
                    value={settings.theme}
                    onValueChange={(value) => updateSetting('theme', value as Settings['theme'])}
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="light" id="light" />
                      <Label htmlFor="light">Light</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="dark" id="dark" />
                      <Label htmlFor="dark">Dark</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="auto" id="auto" />
                      <Label htmlFor="auto">Auto</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label>Font Size: {settings.fontSize}px</Label>
                  <Slider
                    value={[settings.fontSize]}
                    onValueChange={(value) => updateSetting('fontSize', value[0])}
                    min={12}
                    max={24}
                    step={2}
                    className="w-full"
                  />
                  <div className="text-sm bg-card p-3 rounded border" style={{ fontSize: `${settings.fontSize}px` }}>
                    Preview text at {settings.fontSize}px
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fontfamily">Font Family</Label>
                  <Select
                    value={settings.fontFamily}
                    onValueChange={(value) => updateSetting('fontFamily', value as Settings['fontFamily'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sans">Sans-serif</SelectItem>
                      <SelectItem value="serif">Serif</SelectItem>
                      <SelectItem value="mono">Monospace</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>Line Height</Label>
                  <RadioGroup
                    value={settings.lineHeight}
                    onValueChange={(value) => updateSetting('lineHeight', value as Settings['lineHeight'])}
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="compact" id="compact" />
                      <Label htmlFor="compact">Compact</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="normal" id="normal" />
                      <Label htmlFor="normal">Normal</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="relaxed" id="relaxed" />
                      <Label htmlFor="relaxed">Relaxed</Label>
                    </div>
                  </RadioGroup>
                </div>
              </TabsContent>

              <TabsContent value="ai" className="space-y-6 px-1">
                <div className="space-y-3">
                  <Label>Default AI Model</Label>
                  <RadioGroup
                    value={settings.defaultAIModel}
                    onValueChange={(value) => updateSetting('defaultAIModel', value as Settings['defaultAIModel'])}
                    className="space-y-3"
                  >
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="gpt-5-nano" id="nano" />
                        <div>
                          <Label htmlFor="nano" className="font-medium">GPT-5 Nano</Label>
                          <p className="text-sm text-muted-foreground">~$0.0001/request</p>
                        </div>
                      </div>
                      <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        Recommended
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="gpt-5-mini" id="mini" />
                        <div>
                          <Label htmlFor="mini" className="font-medium">GPT-5 Mini</Label>
                          <p className="text-sm text-muted-foreground">~$0.001/request</p>
                        </div>
                      </div>
                      <div className="text-xs bg-secondary/50 text-secondary-foreground px-2 py-1 rounded">
                        Better Quality
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Custom Commands</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCommandSettings(true)}
                    >
                      Edit Commands
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Customize AI commands for your writing workflow
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="voice-lang">Voice Input Language</Label>
                  <Select
                    value={settings.voiceLanguage}
                    onValueChange={(value) => updateSetting('voiceLanguage', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languageOptions.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      <CommandSettings
        showSettings={showCommandSettings}
        onClose={() => setShowCommandSettings(false)}
        onCommandsUpdated={() => {}}
      />
    </>
  );
};