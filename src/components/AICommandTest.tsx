import { useState } from 'react';
import { AICommandCarousel } from '@/components/AICommandCarousel';
import { AICommandPalette } from '@/components/AICommandPalette';
import { UnifiedCommand } from '@/types/commands';
import { useToast } from '@/hooks/use-toast';

export function AICommandTest() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedText, setSelectedText] = useState('This is some selected text for testing');

  const handleCommand = async (command: UnifiedCommand) => {
    setIsLoading(true);
    console.log('Executing command:', command.name);
    
    toast({
      title: `${command.name} Executed`,
      description: `Command executed successfully with ${selectedText ? 'selected text' : 'full document'}`,
    });
    
    // Simulate AI processing
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">AI Command Interface Test</h1>
        <p className="text-muted-foreground">Testing the new carousel and palette components</p>
      </div>

      <div className="space-y-6">
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">AI Command Carousel</h2>
          <AICommandCarousel
            onCommand={handleCommand}
            isLoading={isLoading}
            selectedText={selectedText}
          />
        </div>

        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">AI Command Palette</h2>
          <div className="flex gap-4">
            <AICommandPalette
              onCommand={handleCommand}
              isLoading={isLoading}
              selectedText={selectedText}
            />
            <button
              onClick={() => setSelectedText(selectedText ? '' : 'This is some selected text for testing')}
              className="px-3 py-2 text-sm border rounded hover:bg-accent"
            >
              Toggle Selected Text
            </button>
          </div>
        </div>
      </div>

      {selectedText && (
        <div className="bg-accent/50 rounded-lg p-4">
          <h3 className="font-medium mb-2">Selected Text:</h3>
          <p className="text-sm text-muted-foreground">{selectedText}</p>
        </div>
      )}
    </div>
  );
}