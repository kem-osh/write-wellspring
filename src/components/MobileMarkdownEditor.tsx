import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MobileEditor } from './MobileEditor';
import { MarkdownPreview } from './MarkdownPreview';
import { MarkdownToolbar } from './MarkdownToolbar';
import { Eye, Edit, PanelLeftRight } from 'lucide-react';
import type { Settings } from '@/stores/settingsStore';

interface MobileMarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  isDarkMode: boolean;
  settings: Settings;
  placeholder?: string;
}

export function MobileMarkdownEditor({ 
  value, 
  onChange, 
  isDarkMode, 
  settings, 
  placeholder = "Start writing..." 
}: MobileMarkdownEditorProps) {
  const [mode, setMode] = useState<'edit' | 'preview' | 'split'>('edit');

  const insertMarkdown = (text: string, cursorOffset?: number) => {
    // For mobile, we'll just append at the end
    const newValue = value + text;
    onChange(newValue);
  };

  if (mode === 'split') {
    return (
      <div className="h-full w-full flex flex-col">
        <div className="flex items-center justify-between p-2 border-b">
          <div className="flex gap-1">
            <Button
              variant={mode === 'edit' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('edit')}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant={mode === 'split' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('split')}
            >
              <PanelLeftRight className="w-4 h-4" />
            </Button>
            <Button
              variant={mode === 'preview' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('preview')}
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <MarkdownToolbar onInsert={insertMarkdown} />
        
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-0">
          <div className="border-r">
            <MobileEditor
              value={value}
              onChange={onChange}
              isDarkMode={isDarkMode}
              settings={settings}
              placeholder={placeholder}
            />
          </div>
          <div className="bg-muted/20">
            <MarkdownPreview
              content={value}
              settings={settings}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="h-full flex flex-col">
        <div className="flex items-center justify-between p-2 border-b">
          <TabsList className="grid w-full grid-cols-3 max-w-xs">
            <TabsTrigger value="edit" className="flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="split" className="flex items-center gap-2">
              <PanelLeftRight className="w-4 h-4" />
              Split
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Preview
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="edit" className="flex-1 mt-0">
          <div className="h-full flex flex-col">
            <MarkdownToolbar onInsert={insertMarkdown} />
            <div className="flex-1">
              <MobileEditor
                value={value}
                onChange={onChange}
                isDarkMode={isDarkMode}
                settings={settings}
                placeholder={placeholder}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="flex-1 mt-0">
          <MarkdownPreview
            content={value}
            settings={settings}
          />
        </TabsContent>

        <TabsContent value="split" className="flex-1 mt-0">
          <div className="h-full flex flex-col">
            <MarkdownToolbar onInsert={insertMarkdown} />
            <div className="flex-1 grid grid-rows-2 gap-1">
              <div className="border-b">
                <MobileEditor
                  value={value}
                  onChange={onChange}
                  isDarkMode={isDarkMode}
                  settings={settings}
                  placeholder={placeholder}
                />
              </div>
              <div className="bg-muted/20">
                <MarkdownPreview
                  content={value}
                  settings={settings}
                />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}