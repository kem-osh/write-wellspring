import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CheckCircle, XCircle, Edit3, Copy, RotateCcw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

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
  const isOpen = isLoading || suggestion !== null;
  const [editedText, setEditedText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (suggestion) {
      setEditedText(suggestion.suggestedText);
      setIsEditing(false);
    }
  }, [suggestion]);

  const handleAcceptEdited = () => {
    if (suggestion && editedText.trim()) {
      onAccept({
        ...suggestion,
        suggestedText: editedText.trim()
      });
      setIsEditing(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: "Text has been copied successfully.",
      });
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'light-edit': return 'Light Edit';
      case 'expand': return 'Expand Content';
      case 'condense': return 'Condense Content';
      case 'outline': return 'Create Outline';
      default: return 'AI Suggestion';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing AI Suggestion...
              </>
            ) : suggestion ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                {getTypeLabel(suggestion.type)} Complete
              </>
            ) : null}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-16 w-16 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-lg font-medium mb-2">Analyzing your content...</p>
              <p className="text-sm text-muted-foreground">This usually takes 2-5 seconds</p>
            </div>
          ) : suggestion ? (
            <Tabs defaultValue="comparison" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="comparison">Side by Side</TabsTrigger>
                <TabsTrigger value="edit">Edit & Review</TabsTrigger>
              </TabsList>
              
              <TabsContent value="comparison" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-sm text-muted-foreground">Original Text</h3>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(suggestion.originalText)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="bg-muted/30 p-4 rounded-lg border min-h-[200px] max-h-[300px] overflow-auto">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {suggestion.originalText}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-sm text-muted-foreground">AI Suggestion</h3>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(suggestion.suggestedText)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg border min-h-[200px] max-h-[300px] overflow-auto">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {suggestion.suggestedText}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="edit" className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm text-muted-foreground">
                      {isEditing ? 'Edit AI Suggestion' : 'AI Suggestion'}
                    </h3>
                    <div className="flex items-center gap-2">
                      {!isEditing ? (
                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                          <Edit3 className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => {
                          setEditedText(suggestion.suggestedText);
                          setIsEditing(false);
                        }}>
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Reset
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {isEditing ? (
                    <Textarea
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      className="min-h-[250px] text-sm leading-relaxed"
                    />
                  ) : (
                    <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg border min-h-[250px] overflow-auto">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {editedText}
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <div className="flex gap-3 pt-4 border-t">
                {isEditing ? (
                  <>
                    <Button onClick={handleAcceptEdited} className="flex-1 sm:flex-none">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Accept Edited Version
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1 sm:flex-none">
                      Cancel Edit
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={() => onAccept({...suggestion, suggestedText: editedText})} className="flex-1 sm:flex-none">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Apply Changes
                    </Button>
                    <Button variant="outline" onClick={onReject} className="flex-1 sm:flex-none">
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </Tabs>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}