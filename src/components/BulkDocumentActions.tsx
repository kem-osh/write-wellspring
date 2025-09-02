import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Wand2,
  BarChart3,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Hash,
  Clock,
  Play,
  Pause,
  StopCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BulkDocumentActionsProps {
  selectedDocumentIds: string[];
  documents: Array<{
    id: string;
    title: string;
    content: string;
    word_count: number;
    category?: string;
    status: string;
    created_at: string;
    updated_at: string;
  }>;
  onClose: () => void;
  onAction: (action: string, result?: any) => void;
}

interface BulkOperation {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  minDocs: number;
  color: string;
  confirmationRequired?: boolean;
  destructive?: boolean;
}

interface OperationProgress {
  action: string;
  current: number;
  total: number;
  status: 'running' | 'completed' | 'error' | 'cancelled';
  message: string;
  results?: any[];
  error?: string;
}

export function BulkDocumentActions({
  selectedDocumentIds,
  documents,
  onClose,
  onAction
}: BulkDocumentActionsProps) {
  const [progress, setProgress] = useState<OperationProgress | null>(null);
  const [showConfirmation, setShowConfirmation] = useState<string | null>(null);
  const [operationResults, setOperationResults] = useState<any>(null);
  const { toast } = useToast();
  const { impactLight, notificationSuccess, notificationError } = useHaptics();

  const selectedDocs = useMemo(() => 
    documents.filter(doc => selectedDocumentIds.includes(doc.id)),
    [documents, selectedDocumentIds]
  );

  const stats = useMemo(() => {
    const totalWords = selectedDocs.reduce((sum, doc) => sum + (doc.word_count || 0), 0);
    const categories = Array.from(new Set(selectedDocs.map(doc => doc.category)));
    const statuses = selectedDocs.reduce((acc, doc) => {
      acc[doc.status] = (acc[doc.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return { totalWords, categories, statuses, count: selectedDocs.length };
  }, [selectedDocs]);

  const operations: BulkOperation[] = [
    {
      id: 'synthesize',
      label: 'Synthesize Documents',
      description: 'Combine selected documents into a unified narrative',
      icon: Wand2,
      variant: 'default',
      minDocs: 2,
      color: 'text-primary',
      confirmationRequired: false
    },
    {
      id: 'compare',
      label: 'Compare & Analyze',
      description: 'Generate detailed comparison analysis between documents',
      icon: GitCompare,
      variant: 'secondary',
      minDocs: 2,
      color: 'text-blue-600',
      confirmationRequired: false
    },
    {
      id: 'analyze',
      label: 'Bulk Analysis',
      description: 'Extract themes, patterns, and insights across all documents',
      icon: BarChart3,
      variant: 'secondary',
      minDocs: 1,
      color: 'text-purple-600',
      confirmationRequired: false
    },
    {
      id: 'export',
      label: 'Export Collection',
      description: 'Download as combined Markdown file with metadata',
      icon: Download,
      variant: 'outline',
      minDocs: 1,
      color: 'text-green-600',
      confirmationRequired: false
    },
    {
      id: 'duplicate',
      label: 'Duplicate Documents',
      description: 'Create copies of all selected documents',
      icon: Copy,
      variant: 'outline',
      minDocs: 1,
      color: 'text-orange-600',
      confirmationRequired: true
    },
    {
      id: 'archive',
      label: 'Archive Documents',
      description: 'Move documents to archived status',
      icon: Archive,
      variant: 'outline',
      minDocs: 1,
      color: 'text-gray-600',
      confirmationRequired: true
    },
    {
      id: 'delete',
      label: 'Delete Documents',
      description: 'Permanently remove selected documents',
      icon: Trash2,
      variant: 'destructive',
      minDocs: 1,
      color: 'text-red-600',
      confirmationRequired: true,
      destructive: true
    }
  ];

  const availableOperations = operations.filter(op => selectedDocs.length >= op.minDocs);

  const executeOperation = useCallback(async (operationId: string) => {
    const operation = operations.find(op => op.id === operationId);
    if (!operation) return;

    // Show confirmation dialog for operations that require it
    if (operation.confirmationRequired) {
      setShowConfirmation(operationId);
      return;
    }

    await performOperation(operationId);
  }, [operations, selectedDocs]);

  const performOperation = useCallback(async (operationId: string) => {
    const operation = operations.find(op => op.id === operationId);
    if (!operation) return;

    setProgress({
      action: operation.label,
      current: 0,
      total: selectedDocs.length,
      status: 'running',
      message: 'Initializing...'
    });

    setShowConfirmation(null);
    impactLight();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let result;
      const results: any[] = [];

      switch (operationId) {
        case 'synthesize':
          setProgress(prev => prev ? { ...prev, message: 'Synthesizing documents...' } : null);
          
          result = await supabase.functions.invoke('synthesize-documents', {
            body: { 
              documentIds: selectedDocumentIds,
              userId: user.id,
              options: {
                preserveStructure: true,
                includeMetadata: true
              }
            }
          });
          
          if (result.error) throw result.error;
          setOperationResults(result.data);
          break;

        case 'compare':
          setProgress(prev => prev ? { ...prev, message: 'Comparing documents...' } : null);
          
          result = await supabase.functions.invoke('compare-documents', {
            body: { 
              documentIds: selectedDocumentIds,
              userId: user.id,
              analysisType: 'comprehensive'
            }
          });
          
          if (result.error) throw result.error;
          setOperationResults(result.data);
          break;

        case 'analyze':
          setProgress(prev => prev ? { ...prev, message: 'Analyzing document patterns...' } : null);
          
          const analysisContent = selectedDocs
            .map(doc => `## ${doc.title}\n\n${doc.content}\n\n---\n`)
            .join('\n');
          
          result = await supabase.functions.invoke('ai-analyze', {
            body: { 
              content: analysisContent,
              analysisType: 'bulk_thematic_analysis',
              userId: user.id,
              metadata: {
                documentCount: selectedDocs.length,
                totalWords: stats.totalWords,
                categories: stats.categories
              }
            }
          });
          
          if (result.error) throw result.error;
          setOperationResults(result.data);
          break;

        case 'export':
          setProgress(prev => prev ? { ...prev, message: 'Preparing export...' } : null);
          
          // Create comprehensive export with metadata
          const exportContent = [
            `# Document Collection Export`,
            `*Generated on ${new Date().toLocaleString()}*`,
            ``,
            `## Collection Summary`,
            `- **Documents:** ${selectedDocs.length}`,
            `- **Total Words:** ${stats.totalWords.toLocaleString()}`,
            `- **Categories:** ${stats.categories.join(', ')}`,
            ``,
            `---`,
            ``,
            ...selectedDocs.map((doc, index) => {
              setProgress(prev => prev ? { 
                ...prev, 
                current: index + 1,
                message: `Exporting: ${doc.title}` 
              } : null);
              
              return [
                `# ${doc.title}`,
                ``,
                `**Category:** ${doc.category || 'General'}  `,
                `**Status:** ${doc.status}  `,
                `**Word Count:** ${doc.word_count?.toLocaleString() || 0}  `,
                `**Created:** ${new Date(doc.created_at).toLocaleDateString()}  `,
                `**Modified:** ${new Date(doc.updated_at).toLocaleDateString()}  `,
                ``,
                doc.content,
                ``,
                `---`,
                ``
              ].join('\n');
            })
          ].join('\n');
          
          const blob = new Blob([exportContent], { type: 'text/markdown;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `document-collection-${selectedDocs.length}-docs-${new Date().toISOString().split('T')[0]}.md`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          result = { data: { success: true, exported: selectedDocs.length } };
          break;

        case 'duplicate':
          const duplicatePromises = selectedDocs.map(async (doc, index) => {
            setProgress(prev => prev ? { 
              ...prev, 
              current: index + 1,
              message: `Duplicating: ${doc.title}` 
            } : null);
            
            const { data, error } = await supabase
              .from('documents')
              .insert({
                title: `${doc.title} (Copy)`,
                content: doc.content,
                category: doc.category,
                status: 'draft',
                user_id: user.id,
                word_count: doc.word_count
              })
              .select()
              .single();
            
            if (error) throw error;
            results.push(data);
            return data;
          });
          
          await Promise.all(duplicatePromises);
          result = { data: { success: true, duplicated: results } };
          break;

        case 'archive':
          setProgress(prev => prev ? { ...prev, message: 'Archiving documents...' } : null);
          
          const { error: archiveError } = await supabase
            .from('documents')
            .update({ status: 'archived' })
            .in('id', selectedDocumentIds);
          
          if (archiveError) throw archiveError;
          result = { data: { success: true, archived: selectedDocs.length } };
          break;

        case 'delete':
          setProgress(prev => prev ? { ...prev, message: 'Deleting documents...' } : null);
          
          const { error: deleteError } = await supabase
            .from('documents')
            .delete()
            .in('id', selectedDocumentIds);
          
          if (deleteError) throw deleteError;
          result = { data: { success: true, deleted: selectedDocs.length } };
          break;

        default:
          throw new Error(`Unknown operation: ${operationId}`);
      }

      // Success state
      setProgress(prev => prev ? {
        ...prev,
        status: 'completed',
        current: selectedDocs.length,
        message: getSuccessMessage(operationId, selectedDocs.length)
      } : null);

      notificationSuccess();
      toast({
        title: "Operation Completed",
        description: getSuccessMessage(operationId, selectedDocs.length),
      });

      onAction(operationId, result);

      // Auto-close after 3 seconds for non-result operations
      if (!['synthesize', 'compare', 'analyze'].includes(operationId)) {
        setTimeout(() => {
          setProgress(null);
          onClose();
        }, 3000);
      }

    } catch (error) {
      console.error(`Bulk operation ${operationId} error:`, error);
      
      setProgress(prev => prev ? {
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      } : null);

      notificationError();
      toast({
        title: `${operation.label} Failed`,
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  }, [operations, selectedDocs, selectedDocumentIds, stats, impactLight, notificationSuccess, notificationError, toast, onAction, onClose]);

  const getSuccessMessage = (action: string, count: number) => {
    const messages = {
      synthesize: `Successfully synthesized ${count} documents into a new unified document.`,
      compare: `Generated comprehensive comparison analysis of ${count} documents.`,
      analyze: `Completed thematic analysis of ${count} documents with insights and patterns.`,
      export: `Exported ${count} documents to Markdown file with metadata.`,
      duplicate: `Created copies of ${count} documents.`,
      archive: `Archived ${count} documents.`,
      delete: `Permanently deleted ${count} documents.`
    };
    return messages[action as keyof typeof messages] || `Completed operation on ${count} documents.`;
  };

  const cancelOperation = useCallback(() => {
    setProgress(prev => prev ? {
      ...prev,
      status: 'cancelled',
      message: 'Operation cancelled by user'
    } : null);
    
    setTimeout(() => {
      setProgress(null);
    }, 2000);
  }, []);

  const closeResults = useCallback(() => {
    setProgress(null);
    setOperationResults(null);
    onClose();
  }, [onClose]);

  // Progress Modal
  if (progress) {
    return (
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {progress.status === 'running' && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
              {progress.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-600" />}
              {progress.status === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
              {progress.status === 'cancelled' && <StopCircle className="w-5 h-5 text-orange-600" />}
              {progress.action}
            </DialogTitle>
            <DialogDescription>
              {progress.message}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              <Progress 
                value={(progress.current / progress.total) * 100} 
                className="h-2"
              />
            </div>

            {progress.status === 'error' && progress.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{progress.error}</AlertDescription>
              </Alert>
            )}

            {operationResults && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm">Results</h4>
                <pre className="text-xs bg-background p-3 rounded overflow-auto max-h-40">
                  {JSON.stringify(operationResults, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <DialogFooter>
            {progress.status === 'running' && (
              <Button variant="outline" onClick={cancelOperation}>
                <Pause className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            )}
            {progress.status !== 'running' && (
              <Button onClick={closeResults}>
                {progress.status === 'completed' ? 'Done' : 'Close'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      {/* Sticky Action Bar */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-4xl px-4">
        <Card className="bg-card/95 backdrop-blur-lg border shadow-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Bulk Actions</h3>
                </div>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    {stats.count} documents
                  </span>
                  <span className="flex items-center gap-1">
                    <Hash className="w-4 h-4" />
                    {stats.totalWords.toLocaleString()} words
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Status badges */}
            <div className="flex items-center gap-2 mb-4">
              {stats.categories.map(category => (
                <Badge key={category} variant="secondary" className="text-xs">
                  {category}
                </Badge>
              ))}
              {Object.entries(stats.statuses).map(([status, count]) => (
                <Badge key={status} variant="outline" className="text-xs">
                  {status}: {count}
                </Badge>
              ))}
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {availableOperations.map((operation) => {
                const Icon = operation.icon;
                return (
                  <Button
                    key={operation.id}
                    variant={operation.variant}
                    size="sm"
                    onClick={() => executeOperation(operation.id)}
                    className={cn(
                      "flex flex-col items-center gap-1 h-auto p-3 text-xs",
                      operation.destructive && "hover:bg-destructive hover:text-destructive-foreground"
                    )}
                    title={operation.description}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="truncate max-w-full">{operation.label}</span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <Dialog open={true} onOpenChange={() => setShowConfirmation(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Action</DialogTitle>
              <DialogDescription>
                {(() => {
                  const operation = operations.find(op => op.id === showConfirmation);
                  if (!operation) return '';
                  
                  if (operation.destructive) {
                    return `Are you sure you want to ${operation.label.toLowerCase()}? This action cannot be undone.`;
                  }
                  
                  return `Are you sure you want to ${operation.label.toLowerCase()} ${stats.count} document${stats.count > 1 ? 's' : ''}?`;
                })()}
              </DialogDescription>
            </DialogHeader>

            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <div className="text-sm font-medium">Selected Documents:</div>
              <div className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                {selectedDocs.slice(0, 5).map(doc => (
                  <div key={doc.id} className="truncate">• {doc.title}</div>
                ))}
                {selectedDocs.length > 5 && (
                  <div className="text-muted-foreground/70">
                    ... and {selectedDocs.length - 5} more
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmation(null)}>
                Cancel
              </Button>
              <Button 
                variant={operations.find(op => op.id === showConfirmation)?.destructive ? 'destructive' : 'default'}
                onClick={() => performOperation(showConfirmation)}
              >
                <Play className="w-4 h-4 mr-2" />
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}