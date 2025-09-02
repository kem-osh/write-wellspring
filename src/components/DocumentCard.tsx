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
  Clock,
  CheckSquare,
  Square
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
  showCheckbox?: boolean;
  onSelectionToggle?: (documentId: string) => void;
}

export function DocumentCard({
  document,
  isSelected,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  searchQuery,
  compact = false,
  showCheckbox = false,
  onSelectionToggle
}: DocumentCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-status-draft/10 text-status-draft border-status-draft/20';
      case 'polished': return 'bg-primary/10 text-primary border-primary/20'; 
      case 'final': return 'bg-accent/10 text-accent border-accent/20';
      default: return 'bg-muted/50 text-muted-foreground border-border';
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

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger selection if clicking on checkbox or menu
    if ((e.target as Element).closest('[data-checkbox]') || isMenuOpen) {
      return;
    }
    onSelect(document);
  };

  const handleCheckboxToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectionToggle?.(document.id);
  };

  return (
    <Card 
      variant={compact ? "mobile" : "compact"}
      className={`group transition-all duration-200 hover:shadow-sm cursor-pointer ${
        isSelected ? 'ring-1 ring-primary/40 bg-primary/5' : 'hover:shadow-sm'
      }`}
      onClick={handleCardClick}
    >
      <CardContent padding="xs">
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Selection Checkbox */}
              {showCheckbox && (
                <button
                  onClick={handleCheckboxToggle}
                  data-checkbox
                  className={`touch-target ${compact ? 'p-1 -m-1' : 'p-2 -m-2'} rounded-md hover:bg-secondary/50 transition-colors`}
                >
                  {isSelected ? (
                    <CheckSquare className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-primary`} />
                  ) : (
                    <Square className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-muted-foreground hover:text-foreground`} />
                  )}
                </button>
              )}
              
              <div className="flex-1 min-w-0">
                <div className={`flex items-center gap-3 ${compact ? 'mb-1' : 'mb-2'}`}>
                  <FileText className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-primary/70 flex-shrink-0`} />
                  <h3 
                    className={`${compact ? 'text-sm font-medium' : 'text-heading-md font-semibold'} line-clamp-2 lg:line-clamp-3`}
                    title={document.title}
                  >
                    {highlightSearchTerm(document.title, searchQuery)}
                  </h3>
                </div>
              </div>
            </div>

            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size={compact ? "sm" : "icon"}
                  className="opacity-0 group-hover:opacity-100 transition-opacity touch-target"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className={compact ? "h-3 w-3" : "h-4 w-4"} />
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

          {/* Metadata */}
          <div className={`flex items-center gap-3 ${compact ? 'text-xs' : 'text-body-sm'} text-muted-foreground`}>
            <div className="flex items-center gap-2">
              <Calendar className={compact ? "h-3 w-3" : "h-4 w-4"} />
              <span>{format(new Date(document.updated_at), 'MMM d, yyyy')}</span>
            </div>
            <span className="text-border">•</span>
            <div className="flex items-center gap-2">
              <Hash className={compact ? "h-3 w-3" : "h-4 w-4"} />
              <span>{formatWordCount(document.word_count)} words</span>
            </div>
          </div>

          {/* Content Preview - Hide in compact mode */}
          {!compact && document.content && (
            <div className="bg-surface/30 rounded-lg p-4 border border-border/30">
              <p className="text-body-md text-foreground/80 leading-relaxed line-clamp-2">
                {highlightSearchTerm(getPreviewText(document.content, 140), searchQuery)}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className={`flex items-center justify-between ${compact ? 'pt-2' : 'pt-4'} border-t border-border/30`}>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={`${compact ? 'text-[10px] px-2 py-0.5' : 'text-xs px-3 py-1'} font-medium ${getStatusColor(document.status)}`}>
                {document.status}
              </Badge>
              <Badge variant="outline" className={`${compact ? 'text-[10px] px-2 py-0.5' : 'text-xs px-3 py-1'} font-medium bg-secondary/50 text-secondary-foreground border-secondary/50`}>
                {document.category}
              </Badge>
            </div>
            
            <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-body-sm'} text-muted-foreground`}>
              <Clock className={compact ? "h-3 w-3" : "h-4 w-4"} />
              <span>{format(new Date(document.updated_at), 'HH:mm')}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}