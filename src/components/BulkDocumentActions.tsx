import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useHaptics } from '@/hooks/useHaptics';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, 
  Sparkles, 
  GitCompare, 
  Copy, 
  Archive, 
  Trash2, 
  Download, 
  Share2,
  Wand2,
  BarChart3,
  MessageSquare,
  X
} from 'lucide-react';

interface BulkDocumentActionsProps {
  selectedDocumentIds: string[];
  documents: Array<{
    id: string;
    title: string;
    content: string;
    word_count: number;
    category: string;
  }>;
  onClose: () => void;
  onAction: (action: string, result?: any) => void;
}

export function BulkDocumentActions({
  selectedDocumentIds,
  documents,
  onClose,
  onAction
}: BulkDocumentActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();
  const { impactLight, notificationSuccess, notificationError } = useHaptics();

  const selectedDocs = documents.filter(doc => selectedDocumentIds.includes(doc.id));
  const totalWords = selectedDocs.reduce((sum, doc) => sum + (doc.word_count || 0), 0);

  const executeAction = async (actionType: string, functionName?: string) => {
    if (selectedDocs.length === 0) return;

    setLoading(actionType);
    impactLight();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let result;

      switch (actionType) {
        case 'synthesize':
          if (selectedDocs.length < 2) {
            throw new Error('Select at least 2 documents to synthesize');
          }
          result = await supabase.functions.invoke('synthesize-documents', {
            body: { 
              documentIds: selectedDocumentIds,
              userId: user.id 
            }
          });
          break;

        case 'compare':
          if (selectedDocs.length < 2) {
            throw new Error('Select at least 2 documents to compare');
          }
          result = await supabase.functions.invoke('compare-documents', {
            body: { 
              documentIds: selectedDocumentIds,
              userId: user.id 
            }
          });
          break;

        case 'analyze':
          result = await supabase.functions.invoke('ai-analyze', {
            body: { 
              content: selectedDocs.map(doc => `## ${doc.title}\n${doc.content}`).join('\n\n'),
              analysisType: 'bulk_analysis',
              userId: user.id 
            }
          });
          break;

        case 'export':
          // Create a combined document for export
          const combinedContent = selectedDocs.map(doc => 
            `# ${doc.title}\n\n${doc.content}\n\n---\n\n`
          ).join('');
          
          const blob = new Blob([combinedContent], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `bulk-export-${selectedDocs.length}-documents.md`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          result = { data: { success: true } };
          break;

        case 'duplicate':
          const duplicatePromises = selectedDocs.map(async (doc) => {
            return supabase
              .from('documents')
              .insert({
                title: `${doc.title} (Copy)`,
                content: doc.content,
                category: doc.category,
                status: 'draft',
                user_id: user.id
              });
          });
          
          await Promise.all(duplicatePromises);
          result = { data: { success: true, count: selectedDocs.length } };
          break;

        case 'archive':
          await supabase
            .from('documents')
            .update({ status: 'archived' })
            .in('id', selectedDocumentIds);
          result = { data: { success: true, count: selectedDocs.length } };
          break;

        case 'delete':
          if (!confirm(`Are you sure you want to delete ${selectedDocs.length} documents? This cannot be undone.`)) {
            return;
          }
          await supabase
            .from('documents')
            .delete()
            .in('id', selectedDocumentIds);
          result = { data: { success: true, count: selectedDocs.length } };
          break;

        default:
          throw new Error(`Unknown action: ${actionType}`);
      }

      if (result?.error) throw result.error;

      // Success feedback
      notificationSuccess();
      
      const successMessage = getSuccessMessage(actionType, selectedDocs.length);
      toast({
        title: "Action Completed",
        description: successMessage,
      });

      onAction(actionType, result);

    } catch (error) {
      console.error(`Bulk action ${actionType} error:`, error);
      notificationError();
      
      toast({
        title: `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} Failed`,
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const getSuccessMessage = (action: string, count: number) => {
    switch (action) {
      case 'synthesize':
        return `Successfully synthesized ${count} documents into a new document.`;
      case 'compare':
        return `Generated detailed comparison of ${count} documents.`;
      case 'analyze':
        return `Completed analysis of ${count} documents.`;
      case 'export':
        return `Exported ${count} documents to markdown file.`;
      case 'duplicate':
        return `Created copies of ${count} documents.`;
      case 'archive':
        return `Archived ${count} documents.`;
      case 'delete':
        return `Deleted ${count} documents.`;
      default:
        return `Action completed on ${count} documents.`;
    }
  };

  const actions = [
    {
      id: 'synthesize',
      label: 'Synthesize Documents',
      description: 'Combine selected documents into a new unified document',
      icon: Wand2,
      variant: 'default' as const,
      minDocs: 2,
      color: 'text-primary'
    },
    {
      id: 'compare',
      label: 'Compare Documents',
      description: 'Generate detailed comparison analysis',
      icon: GitCompare,
      variant: 'secondary' as const,
      minDocs: 2,
      color: 'text-accent'
    },
    {
      id: 'analyze',
      label: 'Bulk Analysis',
      description: 'Analyze themes, patterns, and insights across documents',
      icon: BarChart3,
      variant: 'secondary' as const,
      minDocs: 1,
      color: 'text-primary'
    },
    {
      id: 'export',
      label: 'Export as Markdown',
      description: 'Download selected documents as a combined file',
      icon: Download,
      variant: 'outline' as const,
      minDocs: 1,
      color: 'text-muted-foreground'
    },
    {
      id: 'duplicate',
      label: 'Duplicate Documents',
      description: 'Create copies of selected documents',
      icon: Copy,
      variant: 'outline' as const,
      minDocs: 1,
      color: 'text-muted-foreground'
    },
    {
      id: 'archive',
      label: 'Archive Documents',
      description: 'Move documents to archived status',
      icon: Archive,
      variant: 'outline' as const,
      minDocs: 1,
      color: 'text-muted-foreground'
    },
    {
      id: 'delete',
      label: 'Delete Documents',
      description: 'Permanently delete selected documents',
      icon: Trash2,
      variant: 'destructive' as const,
      minDocs: 1,
      color: 'text-destructive'
    }
  ];

  const availableActions = actions.filter(action => selectedDocs.length >= action.minDocs);

  return (
    <Card className="p-6 max-w-2xl mx-auto bg-card/95 backdrop-blur-sm border border-border/20 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Bulk Document Actions
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Perform actions on {selectedDocs.length} selected documents
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="hover:bg-muted/60"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Selection Summary */}
      <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{selectedDocs.length}</span>
            <span className="text-sm text-muted-foreground">documents</span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-2">
            <span className="font-medium">{totalWords.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground">total words</span>
          </div>
        </div>
        <div className="flex gap-1">
          {Array.from(new Set(selectedDocs.map(doc => doc.category))).map(category => (
            <Badge key={category} variant="secondary" className="text-xs">
              {category}
            </Badge>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid gap-3">
        {availableActions.map((action) => {
          const Icon = action.icon;
          const isLoading = loading === action.id;
          
          return (
            <EnhancedButton
              key={action.id}
              variant={action.variant}
              className="justify-start h-auto p-4 text-left"
              onClick={() => executeAction(action.id)}
              disabled={isLoading || (loading !== null)}
              interactive={true}
            >
              <div className="flex items-center gap-3 w-full">
                <Icon className={`h-5 w-5 ${action.color} ${isLoading ? 'animate-spin' : ''}`} />
                <div className="flex-1">
                  <div className="font-medium">{action.label}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {action.description}
                  </div>
                </div>
              </div>
            </EnhancedButton>
          );
        })}
      </div>

      {/* Help Text */}
      <div className="mt-6 p-3 bg-primary/5 border border-primary/10 rounded-lg">
        <p className="text-xs text-muted-foreground">
          <strong>Tip:</strong> Synthesize combines documents into one. Compare analyzes differences. 
          Analysis reveals patterns and themes across your selected documents.
        </p>
      </div>
    </Card>
  );
}