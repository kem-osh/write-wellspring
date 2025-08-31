import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, Loader2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AISuggestion {
  id: string;
  type: 'light-edit' | 'expand' | 'condense' | 'outline';
  originalText: string;
  suggestedText: string;
  changes?: boolean;
}

interface AISuggestionPanelProps {
  suggestion: AISuggestion | null;
  isLoading: boolean;
  onAccept: (suggestion: AISuggestion) => void;
  onReject: () => void;
  onClose: () => void;
}

export function AISuggestionPanel({ 
  suggestion, 
  isLoading, 
  onAccept, 
  onReject, 
  onClose 
}: AISuggestionPanelProps) {
  const [isApplying, setIsApplying] = useState(false);

  if (!suggestion && !isLoading) return null;

  const handleAccept = async () => {
    if (!suggestion) return;
    setIsApplying(true);
    await onAccept(suggestion);
    setIsApplying(false);
    onClose();
  };

  const handleReject = () => {
    onReject();
    onClose();
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'light-edit':
        return 'Light Edit';
      case 'expand':
        return 'Expand';
      case 'condense':
        return 'Condense';
      case 'outline':
        return 'Outline';
      default:
        return 'AI Suggestion';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'light-edit':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'expand':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'condense':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'outline':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] mx-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>AI Suggestion</CardTitle>
            {suggestion && (
              <Badge className={getTypeColor(suggestion.type)}>
                {getTypeLabel(suggestion.type)}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Processing your content with AI...</span>
            </div>
          ) : suggestion ? (
            <div className="space-y-4">
              {suggestion.type === 'light-edit' && suggestion.changes === false ? (
                <div className="text-center py-4">
                  <Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-lg font-medium">No changes needed!</p>
                  <p className="text-muted-foreground">Your content is already well-written.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium mb-2 text-muted-foreground">Original</h3>
                      <ScrollArea className="h-48 border rounded p-3">
                        <p className="text-sm whitespace-pre-wrap">{suggestion.originalText}</p>
                      </ScrollArea>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-2 text-primary">AI Suggestion</h3>
                      <ScrollArea className="h-48 border rounded p-3 bg-accent/20">
                        <p className="text-sm whitespace-pre-wrap">{suggestion.suggestedText}</p>
                      </ScrollArea>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" onClick={handleReject}>
                      <X className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button onClick={handleAccept} disabled={isApplying}>
                      {isApplying ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      {isApplying ? 'Applying...' : 'Accept'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}