import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/enhanced-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  FileText, 
  MoreVertical, 
  Edit2, 
  Copy, 
  Trash2, 
  Calendar,
  Hash,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';

interface Document {
  id: string;
  title: string;
  content: string;
  category: string;
  status: string;
  word_count: number;
  created_at: string;
  updated_at: string;
}

interface DocumentCardProps {
  document: Document;
  isSelected?: boolean;
  onSelect: (doc: Document) => void;
  onEdit?: (doc: Document) => void;
  onDuplicate?: (doc: Document) => void;
  onDelete?: (docId: string) => void;
  searchQuery?: string;
  compact?: boolean;
}

export function DocumentCard({
  document,
  isSelected,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  searchQuery,
  compact = false
}: DocumentCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'status-draft';
      case 'polished': return 'status-polished'; 
      case 'final': return 'status-final';
      default: return 'muted';
    }
  };

  const formatWordCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  const getPreviewText = (content: string, maxLength: number = 120) => {
    const text = content.replace(/\n/g, ' ').trim();
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const highlightSearchTerm = (text: string, query?: string) => {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const handleCardClick = () => {
    if (!isMenuOpen) {
      onSelect(document);
    }
  };

  return (
    <Card 
      variant="interactive"
      className={`group ${isSelected ? 'ring-2 ring-primary bg-primary/5' : ''}`}
      onClick={handleCardClick}
    >
      <CardContent padding={compact ? "sm" : "default"}>
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <h3 className="text-heading-sm truncate">
                  {highlightSearchTerm(document.title, searchQuery)}
                </h3>
              </div>
              
              <div className="flex items-center gap-2 text-caption">
                <Calendar className="h-3 w-3" />
                <span>{format(new Date(document.updated_at), 'MMM d, yyyy')}</span>
                <span>•</span>
                <Hash className="h-3 w-3" />
                <span>{formatWordCount(document.word_count)} words</span>
              </div>
            </div>

            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(document)}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {onDuplicate && (
                  <DropdownMenuItem onClick={() => onDuplicate(document)}>
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                )}
                {(onEdit || onDuplicate) && onDelete && <DropdownMenuSeparator />}
                {onDelete && (
                  <DropdownMenuItem 
                    onClick={() => onDelete(document.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Content Preview */}
          {!compact && document.content && (
            <p className="text-body-md text-muted-foreground leading-relaxed line-clamp-3">
              {highlightSearchTerm(getPreviewText(document.content), searchQuery)}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-xs ${getStatusColor(document.status)}`}>
                {document.status}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {document.category}
              </Badge>
            </div>
            
            <div className="flex items-center gap-1 text-caption">
              <Clock className="h-3 w-3" />
              <span>{format(new Date(document.updated_at), 'HH:mm')}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}