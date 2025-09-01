import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MobileEditor } from './MobileEditor';
import { MarkdownPreview } from './MarkdownPreview';
import { MarkdownToolbar } from './MarkdownToolbar';
import { Eye, Edit, PanelsLeftRight } from 'lucide-react';
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

  if (mode === 'edit') {
    return (
      <div className="h-full w-full flex flex-col">
        <div className="flex items-center justify-between p-2 border-b">
          <div className="flex gap-1">
            <Button
              variant="default"
              size="sm"
              onClick={() => setMode('edit')}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode('split')}
            >
              <PanelsLeftRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode('preview')}
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        </div>

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
    );
  }

  if (mode === 'preview') {
    return (
      <div className="h-full w-full flex flex-col">
        <div className="flex items-center justify-between p-2 border-b">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode('edit')}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode('split')}
            >
              <PanelsLeftRight className="w-4 h-4" />
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setMode('preview')}
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex-1">
          <MarkdownPreview
            content={value}
            settings={settings}
          />
        </div>
      </div>
    );
  }

  // Split mode
  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center justify-between p-2 border-b">
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMode('edit')}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setMode('split')}
          >
            <PanelsLeftRight className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMode('preview')}
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      </div>

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
  );
}