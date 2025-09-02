import React, { useCallback, useMemo } from 'react';
import { clsx } from 'clsx';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Edit, 
  Copy, 
  Trash2, 
  Clock, 
  FileText,
  Calendar,
  Hash
} from 'lucide-react';

// TypeScript interfaces for better type safety
interface Document {
  id: string;
  title: string;
  content: string;
  description?: string;
  category: string;
  status: string;
  word_count: number;
  type?: string;
  size?: number;
  lastModified?: Date;
  created_at: string;
  updated_at: string;
  isLoading?: boolean;
  thumbnail?: string;
}

interface DocumentCardProps {
  document: Document;
  compact?: boolean;
  isSelected?: boolean;
  onSelect?: (document: Document) => void;
  className?: string;
  disabled?: boolean;
  showMetadata?: boolean;
  showCheckbox?: boolean;
  onSelectionToggle?: (docId: string) => void;
  searchQuery?: string;
  onEdit?: (doc: Document) => void;
  onDuplicate?: (doc: Document) => Promise<void>;
  onDelete?: (docId: string) => void;
}

// Loading skeleton component
const DocumentCardSkeleton: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <Card className="animate-pulse">
    <CardContent className={compact ? "p-3" : "p-4"}>
      <div className={`space-y-${compact ? '2' : '3'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-6 h-6 bg-muted rounded"></div>
            <div className="flex-1 space-y-1">
              <div className="h-3 bg-muted rounded w-3/4"></div>
              <div className="h-2 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Main DocumentCard component
export const DocumentCard = React.memo<DocumentCardProps>(({ 
  document, 
  compact = false, 
  isSelected = false, 
  onSelect,
  onSelectionToggle,
  onEdit,
  onDuplicate,
  onDelete,
  searchQuery = '',
  className = '',
  disabled = false,
  showMetadata = true,
  showCheckbox = false
}) => {
  // Early return for missing document
  if (!document) {
    console.warn('DocumentCard: document prop is required');
    return null;
  }

  // Show skeleton for loading state
  if (document.isLoading) {
    return <DocumentCardSkeleton compact={compact} />;
  }

  // Memoized click handler
  const handleCardClick = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    // Don't trigger card click if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="checkbox"]')) return;
    onSelect?.(document);
  }, [document, onSelect, disabled]);

  // Selection handler
  const handleSelectionChange = useCallback((checked: boolean) => {
    if (!onSelectionToggle || disabled) return;
    onSelectionToggle(document.id);
  }, [onSelectionToggle, document.id, disabled]);

  // Quick action handlers
  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(document);
  }, [onEdit, document]);

  const handleDuplicate = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    await onDuplicate?.(document);
  }, [onDuplicate, document]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(document.id);
  }, [onDelete, document.id]);

  // Search highlighting function
  const highlightText = useCallback((text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-primary/20 text-primary-foreground px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  }, []);

  // Status color mapping
  const getStatusColor = useCallback((status: string) => {
    const statusColors: Record<string, string> = {
      'draft': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      'polished': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      'final': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  }, []);

  // Format date helper
  const formatDate = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    }).format(date);
  }, []);

  // Memoized class names
  const cardClasses = clsx(
    // Base styles
    'group relative transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg overflow-hidden',
    
    // Cursor and interaction states
    disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
    
    // Hover effects with enhanced animations
    !disabled && 'hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
    
    // Selection states with blue border/background
    isSelected && !disabled && 'ring-2 ring-primary bg-primary/10 shadow-lg border-primary',
    !isSelected && !disabled && 'hover:shadow-lg border-border',
    
    // Border styles
    'border-2 transition-colors',
    
    // Custom className
    className
  );

  // Memoized classes for content padding
  const contentClasses = useMemo(() => compact ? "p-2" : "p-3", [compact]);

  // Memoized aria label
  const ariaLabel = useMemo(() => {
    const title = document.title || 'Untitled document';
    const status = isSelected ? ', selected' : '';
    return `${title}${status}`;
  }, [document.title, isSelected]);


  return (
    <Card 
      className={cardClasses}
      onClick={handleCardClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-selected={isSelected}
      aria-label={ariaLabel}
      aria-disabled={disabled}
    >
      <CardContent className={contentClasses}>
        <div className="space-y-3">
          {/* Header with checkbox and quick actions */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Selection Checkbox */}
              {(showCheckbox || isSelected) && (
                <div className="flex-shrink-0 pt-1">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={handleSelectionChange}
                    disabled={disabled}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </div>
              )}

              {/* Document Icon */}
              <div className="flex-shrink-0 pt-1">
                <div className={`flex items-center justify-center rounded-lg bg-muted/50 ${compact ? 'w-8 h-8' : 'w-10 h-10'}`}>
                  <FileText className={`text-muted-foreground ${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
                </div>
              </div>

              {/* Document Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold text-foreground leading-tight ${compact ? 'text-sm' : 'text-base'}`}>
                      {highlightText(document.title || 'Untitled Document', searchQuery)}
                    </h3>
                    
                    {document.content && !compact && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {highlightText(
                          document.content.substring(0, 120) + (document.content.length > 120 ? '...' : ''),
                          searchQuery
                        )}
                      </p>
                    )}
                  </div>
                  
                  {/* Status Badge */}
                  {document.status && (
                    <Badge 
                      variant="secondary" 
                      className={`text-xs font-medium ${getStatusColor(document.status)} flex-shrink-0`}
                    >
                      {document.status}
                    </Badge>
                  )}
                </div>

                {/* Document Stats */}
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  {document.word_count > 0 && (
                    <div className="flex items-center gap-1">
                      <Hash className="w-3 h-3" />
                      <span>{document.word_count.toLocaleString()} words</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(document.updated_at)}</span>
                  </div>
                  
                  {document.category && document.category !== 'general' && (
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary"></span>
                      <span className="capitalize">{document.category}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className={`flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${isSelected ? 'opacity-100' : ''}`}>
              <div className="flex items-center gap-1">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEdit}
                    className="h-8 w-8 p-0 hover:bg-muted-foreground/10"
                    title="Edit document"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
                
                {onDuplicate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDuplicate}
                    className="h-8 w-8 p-0 hover:bg-muted-foreground/10"
                    title="Duplicate document"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                )}
                
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// Set display name for better debugging
DocumentCard.displayName = 'DocumentCard';

// Export types for external use
export type { Document, DocumentCardProps };