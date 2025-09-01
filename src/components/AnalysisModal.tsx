import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, TrendingUp, TrendingDown, Clock, BookOpen, Target, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface AnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: any;
}

export function AnalysisModal({ open, onOpenChange, analysis }: AnalysisModalProps) {
  const isMobile = useIsMobile();

  if (!analysis) return null;

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreVariant = (score: number) => {
    if (score >= 8) return 'default';
    if (score >= 6) return 'secondary';
    return 'destructive';
  };

  const AnalysisContent = () => (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto">
      {/* Overall Score */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5" />
            Overall Quality Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold">
              <Badge variant={getScoreVariant(analysis.overallScore)} className="text-lg px-3 py-1">
                {analysis.overallScore}/10
              </Badge>
            </div>
            <div className="flex-1">
              <Progress value={analysis.overallScore * 10} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reading Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{analysis.wordCount}</p>
                <p className="text-sm text-muted-foreground">Words</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{analysis.readingTime}</p>
                <p className="text-sm text-muted-foreground">Reading Time</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className={`h-4 w-4 ${getScoreColor(analysis.readability?.score || 0)}`}>
                {analysis.readability?.score >= 7 ? <TrendingUp /> : <TrendingDown />}
              </div>
              <div>
                <p className="text-2xl font-bold">{analysis.readability?.score}/10</p>
                <p className="text-sm text-muted-foreground">Readability</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Readability */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Readability Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span>Level</span>
              <Badge variant="outline">{analysis.readability?.level}</Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Suggestions:</p>
              <ul className="space-y-1">
                {analysis.readability?.suggestions?.map((suggestion: string, index: number) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Tone Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tone & Voice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span>Current Tone</span>
              <Badge variant="secondary">{analysis.tone?.current}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Consistency</span>
              <span className={`font-bold ${getScoreColor(analysis.tone?.consistency)}`}>
                {analysis.tone?.consistency}/10
              </span>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Improvements:</p>
              <ul className="space-y-1">
                {analysis.tone?.suggestions?.map((suggestion: string, index: number) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Structure Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Structure & Flow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span>Structure Score</span>
            <span className={`font-bold ${getScoreColor(analysis.structure?.score)}`}>
              {analysis.structure?.score}/10
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{analysis.structure?.flow}</p>
          <div className="space-y-2">
            <p className="text-sm font-medium">Improvements:</p>
            <ul className="space-y-1">
              {analysis.structure?.suggestions?.map((suggestion: string, index: number) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Strengths and Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-green-700 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.strengths?.map((strength: string, index: number) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600 mt-1 flex-shrink-0" />
                  {strength}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-yellow-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.weaknesses?.map((weakness: string, index: number) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <AlertCircle className="h-3 w-3 text-yellow-600 mt-1 flex-shrink-0" />
                  {weakness}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Action Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recommended Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {analysis.suggestions?.map((suggestion: string, index: number) => (
              <li key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {index + 1}
                </div>
                <p className="text-sm">{suggestion}</p>
              </li>
            ))}
          </ul>
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
              <Target className="h-5 w-5" />
              Document Analysis
            </SheetTitle>
          </SheetHeader>
          <AnalysisContent />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Document Analysis
          </DialogTitle>
        </DialogHeader>
        <AnalysisContent />
      </DialogContent>
    </Dialog>
  );
}