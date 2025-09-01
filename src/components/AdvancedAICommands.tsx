import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  PenTool, 
  RefreshCw, 
  CheckCircle, 
  Combine, 
  GitCompare,
  Loader2,
  FileText,
  Sparkles
} from 'lucide-react';

interface AdvancedAICommandsProps {
  selectedDocuments: string[];
  onDocumentCreated?: (documentId: string) => void;
  onTextInsert?: (text: string) => void;
  onTextReplace?: (text: string) => void;
  getCurrentText?: () => string;
  getSelectedText?: () => string;
  getCursorContext?: () => string;
}

export function AdvancedAICommands({
  selectedDocuments,
  onDocumentCreated,
  onTextInsert,
  onTextReplace,
  getCurrentText,
  getSelectedText,
  getCursorContext
}: AdvancedAICommandsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [showSynthesisDialog, setShowSynthesisDialog] = useState(false);
  const [showRewriteDialog, setShowRewriteDialog] = useState(false);
  const [showComparisonDialog, setShowComparisonDialog] = useState(false);
  const [showFactCheckDialog, setShowFactCheckDialog] = useState(false);
  
  const [synthesisType, setSynthesisType] = useState('merge');
  const [customInstructions, setCustomInstructions] = useState('');
  const [rewriteStyle, setRewriteStyle] = useState('auto');
  const [rewriteAlternatives, setRewriteAlternatives] = useState<any[]>([]);
  const [comparisonResults, setComparisonResults] = useState<any>(null);
  const [factCheckResults, setFactCheckResults] = useState<any>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);

  // Multi-document synthesis
  const handleSynthesis = async () => {
    if (!user || selectedDocuments.length === 0) {
      toast({ title: "Error", description: "Please select documents to synthesize", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('synthesize-documents', {
        body: {
          documentIds: selectedDocuments,
          synthesisType,
          instructions: customInstructions,
          userId: user.id
        }
      });
      
      if (error) throw error;
      
      if (data?.document) {
        onDocumentCreated?.(data.document.id);
        toast({ 
          title: "Success", 
          description: `Documents synthesized into "${data.document.title}"` 
        });
        setShowSynthesisDialog(false);
        setCustomInstructions('');
      }
    } catch (error: any) {
      console.error('Synthesis error:', error);
      toast({ 
        title: "Synthesis Failed", 
        description: error.message || "Failed to synthesize documents", 
        variant: "destructive" 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Smart continuation
  const handleContinue = async () => {
    if (!user) return;
    
    const context = getCursorContext?.() || getCurrentText?.()?.slice(-500) || '';
    if (!context.trim()) {
      toast({ title: "Error", description: "No context found for continuation", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-continue', {
        body: {
          context,
          userId: user.id
        }
      });
      
      if (error) throw error;
      
      if (data?.continuation) {
        onTextInsert?.(data.continuation);
        toast({ title: "Success", description: "Text continued successfully" });
      }
    } catch (error: any) {
      console.error('Continue error:', error);
      toast({ 
        title: "Continue Failed", 
        description: error.message || "Failed to continue text", 
        variant: "destructive" 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Intelligent rewrite with alternatives
  const handleRewrite = async () => {
    if (!user) return;
    
    const selectedText = getSelectedText?.() || '';
    if (!selectedText.trim()) {
      toast({ title: "Error", description: "Please select text to rewrite", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-rewrite', {
        body: {
          text: selectedText,
          style: rewriteStyle,
          userId: user.id
        }
      });
      
      if (error) throw error;
      
      if (data?.alternatives) {
        setRewriteAlternatives(data.alternatives);
        setShowRewriteDialog(true);
      }
    } catch (error: any) {
      console.error('Rewrite error:', error);
      toast({ 
        title: "Rewrite Failed", 
        description: error.message || "Failed to rewrite text", 
        variant: "destructive" 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Fact check against documents
  const handleFactCheck = async () => {
    if (!user) return;
    
    const text = getSelectedText?.() || getCurrentText?.() || '';
    if (!text.trim()) {
      toast({ title: "Error", description: "No text found to fact-check", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-fact-check', {
        body: {
          text,
          userId: user.id
        }
      });
      
      if (error) throw error;
      
      if (data?.analysis) {
        setFactCheckResults(data);
        setShowFactCheckDialog(true);
      }
    } catch (error: any) {
      console.error('Fact check error:', error);
      toast({ 
        title: "Fact Check Failed", 
        description: error.message || "Failed to fact-check text", 
        variant: "destructive" 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Document comparison
  const handleCompare = async () => {
    if (!user || selectedDocuments.length < 2) {
      toast({ title: "Error", description: "Select at least 2 documents to compare", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    
    try {
      // Create command object for comparison
      const compareCommand = {
        name: "Document Comparison",
        prompt: "Compare these documents and analyze their similarities, differences, themes, and structure.",
        system_prompt: "You are an expert document analyst. Compare the provided documents thoroughly, identifying key similarities, differences, themes, and structural patterns.",
        ai_model: "gpt-4o-mini",
        max_tokens: 2000,
        temperature: 0.3
      };

      const { data, error } = await supabase.functions.invoke('compare-documents', {
        body: {
          command: compareCommand,
          documentIds: selectedDocuments,
          userId: user.id
        }
      });
      
      if (error) throw error;
      
      if (data?.analysis) {
        setComparisonResults(data);
        setShowComparisonDialog(true);
      }
    } catch (error: any) {
      console.error('Compare error:', error);
      toast({ 
        title: "Comparison Failed", 
        description: error.message || "Failed to compare documents", 
        variant: "destructive" 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const applyRewrite = (alternative: any) => {
    onTextReplace?.(alternative.content);
    setShowRewriteDialog(false);
    setRewriteAlternatives([]);
    toast({ title: "Success", description: "Text rewritten successfully" });
  };

  return (
    <>
      {/* Basic AI Commands */}
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleContinue}
        disabled={isProcessing}
        title="Continue writing from cursor position"
        className="text-muted-foreground hover:text-foreground"
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <PenTool className="w-4 h-4 mr-2" />
        )}
        Continue
      </Button>
      
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleRewrite}
        disabled={isProcessing}
        title="Rewrite selected text with alternatives"
        className="text-muted-foreground hover:text-foreground"
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <RefreshCw className="w-4 h-4 mr-2" />
        )}
        Rewrite
      </Button>
      
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleFactCheck}
        disabled={isProcessing}
        title="Check consistency with your document library"
        className="text-muted-foreground hover:text-foreground"
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <CheckCircle className="w-4 h-4 mr-2" />
        )}
        Fact Check
      </Button>

      {/* Multi-document Commands */}
      {selectedDocuments.length > 1 && (
        <>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowSynthesisDialog(true)}
            disabled={isProcessing}
            title="Combine selected documents intelligently"
            className="text-muted-foreground hover:text-foreground"
          >
            <Combine className="w-4 h-4 mr-2" />
            Synthesize ({selectedDocuments.length})
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleCompare}
            disabled={isProcessing}
            title="Analyze differences between documents"
            className="text-muted-foreground hover:text-foreground"
          >
            <GitCompare className="w-4 h-4 mr-2" />
            Compare
          </Button>
        </>
      )}

      {/* Synthesis Dialog */}
      <Dialog open={showSynthesisDialog} onOpenChange={setShowSynthesisDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Synthesize {selectedDocuments.length} Documents
            </DialogTitle>
            <DialogDescription>
              Combine your documents into a single, coherent piece using AI
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="synthesis-type">Synthesis Type</Label>
              <Select value={synthesisType} onValueChange={setSynthesisType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="merge">Merge - Combine all content</SelectItem>
                  <SelectItem value="summary">Summary - Key points only</SelectItem>
                  <SelectItem value="outline">Outline - Structured overview</SelectItem>
                  <SelectItem value="comparison">Comparison - Analyze differences</SelectItem>
                  <SelectItem value="bestof">Best Of - Strongest parts from each</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="instructions">Additional Instructions (optional)</Label>
              <Textarea 
                id="instructions"
                placeholder="E.g., Focus on the main arguments, maintain chronological order..."
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                rows={3}
              />
            </div>
            
            <Button 
              onClick={handleSynthesis} 
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing... (this may take a minute)
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Start Synthesis
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rewrite Dialog */}
      <Dialog open={showRewriteDialog} onOpenChange={setShowRewriteDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose Rewrite Alternative</DialogTitle>
            <DialogDescription>
              Select the version you prefer or close to keep the original
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4">
            {rewriteAlternatives.map((alt, index) => (
              <Card key={index} className="cursor-pointer hover:bg-muted/50" onClick={() => applyRewrite(alt)}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    Version {alt.version}
                    <Badge variant="outline">{alt.type}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{alt.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Comparison Dialog */}
      <Dialog open={showComparisonDialog} onOpenChange={setShowComparisonDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Document Comparison Analysis</DialogTitle>
            <DialogDescription>
              AI analysis of similarities and differences between your documents
            </DialogDescription>
          </DialogHeader>
          
          {comparisonResults && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Analysis</h3>
                <p className="text-sm whitespace-pre-wrap">{comparisonResults.analysis}</p>
              </div>
              
              {comparisonResults.similarities?.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Similarity Scores</h3>
                  <div className="space-y-2">
                    {comparisonResults.similarities.map((sim: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">{sim.doc1} ↔ {sim.doc2}</span>
                        <Badge variant="outline">{sim.similarity}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <h3 className="font-semibold mb-2">Documents</h3>
                <div className="grid gap-2">
                  {comparisonResults.documents?.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div>
                        <p className="text-sm font-medium">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">{doc.wordCount} words • {doc.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Fact Check Dialog */}
      <Dialog open={showFactCheckDialog} onOpenChange={setShowFactCheckDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              Fact Check Results
            </DialogTitle>
            <DialogDescription>
              Consistency analysis against your document library
            </DialogDescription>
          </DialogHeader>
          
          {factCheckResults && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Analysis</h3>
                <p className="text-sm whitespace-pre-wrap">{factCheckResults.analysis}</p>
              </div>
              
              {factCheckResults.extractedClaims && (
                <div>
                  <h3 className="font-semibold mb-2">Extracted Claims</h3>
                  <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded">{factCheckResults.extractedClaims}</p>
                </div>
              )}
              
              {factCheckResults.referencedDocuments?.length > 0 ? (
                <div>
                  <h3 className="font-semibold mb-2">Reference Documents</h3>
                  <div className="space-y-2">
                    {factCheckResults.referencedDocuments.map((doc: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">{doc.title}</span>
                        <Badge variant="outline">{doc.relevance} relevant</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-muted rounded">
                  <p className="text-sm text-muted-foreground">
                    No reference documents found. Fact-checking is limited to internal consistency.
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}