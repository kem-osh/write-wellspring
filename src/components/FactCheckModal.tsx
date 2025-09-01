import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle, Info, ExternalLink, Shield, FileText, Clock } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface FactCheckModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  factCheckData: any;
}

export function FactCheckModal({ open, onOpenChange, factCheckData }: FactCheckModalProps) {
  const isMobile = useIsMobile();

  if (!factCheckData) return null;

  const { analysis, extractedClaims, referencedDocuments, hasReferences } = factCheckData;

  const FactCheckContent = () => (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-600">Fact-Check</p>
                <p className="text-sm text-muted-foreground">Analysis Complete</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{referencedDocuments?.length || 0}</p>
                <p className="text-sm text-muted-foreground">References Found</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">
                  {hasReferences ? 'High' : 'Limited'}
                </p>
                <p className="text-sm text-muted-foreground">Confidence Level</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reference Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {hasReferences ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                Reference Documents Found
              </>
            ) : (
              <>
                <Info className="h-5 w-5 text-yellow-600" />
                Limited Reference Data
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasReferences ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Found {referencedDocuments.length} related documents in your library for cross-reference.
              </p>
              <div className="space-y-2">
                {referencedDocuments.map((doc: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{doc.title}</span>
                    </div>
                    <Badge variant="outline">{doc.relevance}</Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No related documents found in your library. Fact-checking is limited to internal consistency analysis.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Extracted Claims */}
      {extractedClaims && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identified Claims</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/30 p-4 rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{extractedClaims}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Fact-Check Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <div className="bg-muted/30 p-4 rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{analysis}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Important Disclaimer
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                This analysis is based on {hasReferences ? 'your document library and' : ''} AI reasoning. 
                Always verify important facts with authoritative sources. This tool is designed to help identify 
                claims that may need verification, not to provide definitive fact-checking.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-hidden">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Fact-Check Results
            </SheetTitle>
          </SheetHeader>
          <FactCheckContent />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Fact-Check Results
          </DialogTitle>
        </DialogHeader>
        <FactCheckContent />
      </DialogContent>
    </Dialog>
  );
}