import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
import { RotateCcw, X, Monitor, Sun, Moon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();
  const [showCommandSettings, setShowCommandSettings] = useState(false);

  const handleReset = () => {
    resetSettings();
    toast({
      title: 'Settings Reset',
      description: 'All settings have been restored to defaults.',
    });
  };

  const handleSaveAndClose = () => {
    onOpenChange(false);
    toast({
      title: 'Settings Saved',
      description: 'Your preferences have been updated.',
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

  const SettingsContent = () => (
    <div className="flex flex-col h-full">
      <Tabs defaultValue="general" className="flex-1 flex flex-col">
        <TabsList className={`grid w-full grid-cols-3 ${isMobile ? 'h-12' : 'h-9'}`}>
          <TabsTrigger value="general" className={isMobile ? 'h-10 text-base' : ''}>General</TabsTrigger>
          <TabsTrigger value="editor" className={isMobile ? 'h-10 text-base' : ''}>Editor</TabsTrigger>
          <TabsTrigger value="ai" className={isMobile ? 'h-10 text-base' : ''}>AI</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          <TabsContent value="general" className="space-y-6 px-1 py-4 pb-8">
            <div className="space-y-3">
              <Label htmlFor="autosave" className={isMobile ? 'text-base' : ''}>Auto-Save Interval</Label>
              <Select
                value={settings.autoSaveInterval.toString()}
                onValueChange={(value) => updateSetting('autoSaveInterval', parseInt(value))}
              >
                <SelectTrigger className={`bg-background border ${isMobile ? 'h-12 text-base' : ''}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {autoSaveOptions.map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value.toString()}
                      className={`${isMobile ? 'h-12 text-base' : ''} hover:bg-muted`}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="category" className={isMobile ? 'text-base' : ''}>Default Document Category</Label>
              <Select
                value={settings.defaultCategory}
                onValueChange={(value) => updateSetting('defaultCategory', value)}
              >
                <SelectTrigger className={`bg-background border ${isMobile ? 'h-12 text-base' : ''}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="general" className={`${isMobile ? 'h-12 text-base' : ''} hover:bg-muted`}>General</SelectItem>
                  <SelectItem value="blog" className={`${isMobile ? 'h-12 text-base' : ''} hover:bg-muted`}>Blog</SelectItem>
                  <SelectItem value="book" className={`${isMobile ? 'h-12 text-base' : ''} hover:bg-muted`}>Book</SelectItem>
                  <SelectItem value="essay" className={`${isMobile ? 'h-12 text-base' : ''} hover:bg-muted`}>Essay</SelectItem>
                  <SelectItem value="notes" className={`${isMobile ? 'h-12 text-base' : ''} hover:bg-muted`}>Notes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className={`flex items-center justify-between ${isMobile ? 'py-2' : ''}`}>
              <Label htmlFor="autotitle" className={isMobile ? 'text-base' : ''}>Auto-Generate Titles</Label>
              <Switch
                id="autotitle"
                checked={settings.autoGenerateTitles}
                onCheckedChange={(checked) => updateSetting('autoGenerateTitles', checked)}
                className={isMobile ? 'scale-125' : ''}
              />
            </div>

            <div className="space-y-4">
              <Label className={isMobile ? 'text-base' : ''}>Export Format</Label>
              <RadioGroup
                value={settings.exportFormat}
                onValueChange={(value) => updateSetting('exportFormat', value as Settings['exportFormat'])}
                className={`grid grid-cols-2 gap-4 ${isMobile ? 'gap-6' : ''}`}
              >
                <div className={`flex items-center space-x-3 ${isMobile ? 'py-1' : ''}`}>
                  <RadioGroupItem value="txt" id="txt" className={isMobile ? 'scale-125' : ''} />
                  <Label htmlFor="txt" className={isMobile ? 'text-base' : ''}>Plain Text</Label>
                </div>
                <div className={`flex items-center space-x-3 ${isMobile ? 'py-1' : ''}`}>
                  <RadioGroupItem value="md" id="md" className={isMobile ? 'scale-125' : ''} />
                  <Label htmlFor="md" className={isMobile ? 'text-base' : ''}>Markdown</Label>
                </div>
                <div className={`flex items-center space-x-3 ${isMobile ? 'py-1' : ''}`}>
                  <RadioGroupItem value="docx" id="docx" className={isMobile ? 'scale-125' : ''} />
                  <Label htmlFor="docx" className={isMobile ? 'text-base' : ''}>Word Document</Label>
                </div>
                <div className={`flex items-center space-x-3 ${isMobile ? 'py-1' : ''}`}>
                  <RadioGroupItem value="pdf" id="pdf" className={isMobile ? 'scale-125' : ''} />
                  <Label htmlFor="pdf" className={isMobile ? 'text-base' : ''}>PDF</Label>
                </div>
              </RadioGroup>
            </div>
          </TabsContent>

          <TabsContent value="editor" className="space-y-6 px-1 py-4 pb-8">
            <div className="space-y-4">
              <Label className={isMobile ? 'text-base' : ''}>Theme</Label>
              <RadioGroup
                value={settings.theme}
                onValueChange={(value) => updateSetting('theme', value as Settings['theme'])}
                className={`flex gap-6 ${isMobile ? 'gap-8' : ''}`}
              >
                <div className={`flex items-center space-x-3 ${isMobile ? 'py-1' : ''}`}>
                  <RadioGroupItem value="light" id="light" className={isMobile ? 'scale-125' : ''} />
                  <Label htmlFor="light" className={`flex items-center gap-2 ${isMobile ? 'text-base' : ''}`}>
                    <Sun className="h-4 w-4" />
                    Light
                  </Label>
                </div>
                <div className={`flex items-center space-x-3 ${isMobile ? 'py-1' : ''}`}>
                  <RadioGroupItem value="dark" id="dark" className={isMobile ? 'scale-125' : ''} />
                  <Label htmlFor="dark" className={`flex items-center gap-2 ${isMobile ? 'text-base' : ''}`}>
                    <Moon className="h-4 w-4" />
                    Dark
                  </Label>
                </div>
                <div className={`flex items-center space-x-3 ${isMobile ? 'py-1' : ''}`}>
                  <RadioGroupItem value="auto" id="auto" className={isMobile ? 'scale-125' : ''} />
                  <Label htmlFor="auto" className={`flex items-center gap-2 ${isMobile ? 'text-base' : ''}`}>
                    <Monitor className="h-4 w-4" />
                    Auto
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-4">
              <Label className={isMobile ? 'text-base' : ''}>Font Size: {settings.fontSize}px</Label>
              <Slider
                value={[settings.fontSize]}
                onValueChange={(value) => updateSetting('fontSize', value[0])}
                min={12}
                max={24}
                step={2}
                className={`w-full ${isMobile ? 'h-8' : ''}`}
              />
              <div 
                className={`text-sm bg-card p-4 rounded border ${isMobile ? 'p-6' : ''}`} 
                style={{ 
                  fontSize: `${Math.max(settings.fontSize, isMobile ? 16 : settings.fontSize)}px`,
                  fontFamily: settings.fontFamily === 'serif' ? 'Georgia, Times, serif' : 
                             settings.fontFamily === 'mono' ? "'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace" : 
                             'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                  lineHeight: settings.lineHeight === 'compact' ? '1.4' : 
                             settings.lineHeight === 'relaxed' ? '1.8' : '1.6'
                }}
              >
                Preview: The quick brown fox jumps over the lazy dog. This text shows how your writing will appear with the current font settings.
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="fontfamily" className={isMobile ? 'text-base' : ''}>Font Family</Label>
              <Select
                value={settings.fontFamily}
                onValueChange={(value) => updateSetting('fontFamily', value as Settings['fontFamily'])}
              >
                <SelectTrigger className={`bg-background border ${isMobile ? 'h-12 text-base' : ''}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="sans" className={`${isMobile ? 'h-12 text-base' : ''} hover:bg-muted`}>Sans-serif</SelectItem>
                  <SelectItem value="serif" className={`${isMobile ? 'h-12 text-base' : ''} hover:bg-muted`}>Serif</SelectItem>
                  <SelectItem value="mono" className={`${isMobile ? 'h-12 text-base' : ''} hover:bg-muted`}>Monospace</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <Label className={isMobile ? 'text-base' : ''}>Line Height</Label>
              <RadioGroup
                value={settings.lineHeight}
                onValueChange={(value) => updateSetting('lineHeight', value as Settings['lineHeight'])}
                className={`flex gap-6 ${isMobile ? 'gap-8' : ''}`}
              >
                <div className={`flex items-center space-x-3 ${isMobile ? 'py-1' : ''}`}>
                  <RadioGroupItem value="compact" id="compact" className={isMobile ? 'scale-125' : ''} />
                  <Label htmlFor="compact" className={isMobile ? 'text-base' : ''}>Compact</Label>
                </div>
                <div className={`flex items-center space-x-3 ${isMobile ? 'py-1' : ''}`}>
                  <RadioGroupItem value="normal" id="normal" className={isMobile ? 'scale-125' : ''} />
                  <Label htmlFor="normal" className={isMobile ? 'text-base' : ''}>Normal</Label>
                </div>
                <div className={`flex items-center space-x-3 ${isMobile ? 'py-1' : ''}`}>
                  <RadioGroupItem value="relaxed" id="relaxed" className={isMobile ? 'scale-125' : ''} />
                  <Label htmlFor="relaxed" className={isMobile ? 'text-base' : ''}>Relaxed</Label>
                </div>
              </RadioGroup>
            </div>
          </TabsContent>

          <TabsContent value="ai" className="space-y-6 px-1 py-4 pb-8">
            <div className="space-y-4">
              <Label className={isMobile ? 'text-base' : ''}>Default AI Model</Label>
              <RadioGroup
                value={settings.defaultAIModel}
                onValueChange={(value) => updateSetting('defaultAIModel', value as Settings['defaultAIModel'])}
                className="space-y-4"
              >
                <div className={`flex items-center justify-between p-4 border rounded ${isMobile ? 'p-6' : ''}`}>
                  <div className="flex items-center space-x-3">
                     <RadioGroupItem value="gpt-4o-mini" id="nano" className={isMobile ? 'scale-125' : ''} />
                    <div>
                      <Label htmlFor="nano" className={`font-medium ${isMobile ? 'text-base' : ''}`}>GPT-4o Mini</Label>
                      <p className={`text-muted-foreground ${isMobile ? 'text-sm' : 'text-xs'}`}>~$0.0001/request</p>
                    </div>
                  </div>
                  <div className={`text-xs bg-primary/10 text-primary px-2 py-1 rounded ${isMobile ? 'text-sm px-3 py-2' : ''}`}>
                    Recommended
                  </div>
                </div>
                <div className={`flex items-center justify-between p-4 border rounded ${isMobile ? 'p-6' : ''}`}>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="gpt-4o" id="mini" className={isMobile ? 'scale-125' : ''} />
                    <div>
                      <Label htmlFor="mini" className={`font-medium ${isMobile ? 'text-base' : ''}`}>GPT-4o</Label>
                      <p className={`text-muted-foreground ${isMobile ? 'text-sm' : 'text-xs'}`}>~$0.001/request</p>
                    </div>
                  </div>
                  <div className={`text-xs bg-secondary/50 text-secondary-foreground px-2 py-1 rounded ${isMobile ? 'text-sm px-3 py-2' : ''}`}>
                    Better Quality
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className={isMobile ? 'text-base' : ''}>Custom Commands</Label>
                <Button
                  variant="outline"
                  size={isMobile ? "default" : "sm"}
                  onClick={() => setShowCommandSettings(true)}
                  className={isMobile ? 'h-12 px-6 text-base' : ''}
                >
                  Edit Commands
                </Button>
              </div>
              <p className={`text-muted-foreground ${isMobile ? 'text-sm' : 'text-xs'}`}>
                Customize AI commands for your writing workflow
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="voice-lang" className={isMobile ? 'text-base' : ''}>Voice Input Language</Label>
              <Select
                value={settings.voiceLanguage}
                onValueChange={(value) => updateSetting('voiceLanguage', value)}
              >
                <SelectTrigger className={`bg-background border ${isMobile ? 'h-12 text-base' : ''}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {languageOptions.map((lang) => (
                    <SelectItem 
                      key={lang.value} 
                      value={lang.value}
                      className={`${isMobile ? 'h-12 text-base' : ''} hover:bg-muted`}
                    >
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <div className={`flex items-center justify-between pt-4 border-t ${isMobile ? 'pt-6 flex-col gap-4' : ''}`}>
        <Button
          variant="outline"
          onClick={handleReset}
          className={`flex items-center gap-2 ${isMobile ? 'h-12 px-6 text-base w-full' : ''}`}
        >
          <RotateCcw className="h-4 w-4" />
          Reset to Defaults
        </Button>
        <Button 
          onClick={handleSaveAndClose}
          className={isMobile ? 'h-12 px-6 text-base w-full' : ''}
        >
          Done
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {isMobile ? (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent side="bottom" className="max-h-[85vh] p-0 pt-safe">
            <div className="flex flex-col h-full max-h-[85vh] p-4 pb-safe px-6 overflow-hidden overscroll-contain">
              <SheetHeader className="pb-4">
                <SheetTitle className="text-left text-xl">Settings</SheetTitle>
              </SheetHeader>
              <SettingsContent />
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-2xl max-h-[90vh] p-0">
            <div className="flex flex-col h-full p-6">
              <DialogHeader className="pb-4">
                <DialogTitle className="text-xl">Settings</DialogTitle>
                <DialogDescription>
                  Customize your writing experience, AI preferences, and application behavior.
                </DialogDescription>
              </DialogHeader>
              <SettingsContent />
            </div>
          </DialogContent>
        </Dialog>
      )}


      <CommandSettings
        showSettings={showCommandSettings}
        onClose={() => setShowCommandSettings(false)}
        onCommandsUpdated={() => {}}
      />
    </>
  );
};