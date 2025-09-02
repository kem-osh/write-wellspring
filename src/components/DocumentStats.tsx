import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { FileText, Hash } from 'lucide-react';
interface Document {
  id: string;
  status: string;
  word_count: number;
}
interface DocumentStatsProps {
  documents: Document[];
}
export function DocumentStats({
  documents
}: DocumentStatsProps) {
  const stats = useMemo(() => {
    const total = documents.length;
    const totalWords = documents.reduce((sum, doc) => sum + (doc.word_count || 0), 0);
    const statusCounts = documents.reduce((acc, doc) => {
      acc[doc.status] = (acc[doc.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const drafts = statusCounts.draft || 0;
    const polished = statusCounts.polished || 0;
    const final = statusCounts.final || 0;
    return {
      total,
      totalWords,
      drafts,
      polished,
      final
    };
  }, [documents]);
  const formatWordCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toLocaleString();
  };
  const formatDocumentCount = (count: number) => {
    return count.toLocaleString();
  };
  return <div className="p-4 border-t space-y-3 bg-slate-100">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Library Stats
      </div>
      
      {/* Total counts */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-muted-foreground">
            <FileText className="h-3 w-3" />
            Documents
          </span>
          <span className="font-medium">{formatDocumentCount(stats.total)}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Hash className="h-3 w-3" />
            Total Words
          </span>
          <span className="font-medium">{formatWordCount(stats.totalWords)}</span>
        </div>
      </div>

      {/* Status breakdown */}
      {stats.total > 0 && <div className="space-y-2">
          <div className="text-xs text-muted-foreground">By Status:</div>
          <div className="space-y-1 text-xs">
            {stats.drafts > 0 && <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span>Drafts</span>
                </div>
                <span className="font-medium">{stats.drafts}</span>
              </div>}
            {stats.polished > 0 && <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Polished</span>
                </div>
                <span className="font-medium">{stats.polished}</span>
              </div>}
            {stats.final > 0 && <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>Final</span>
                </div>
                <span className="font-medium">{stats.final}</span>
              </div>}
          </div>
        </div>}
    </div>;
}