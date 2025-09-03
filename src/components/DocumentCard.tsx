import React, { useCallback, useMemo } from 'react';
import { clsx } from 'clsx';
import { Card, CardContent } from '@/components/ui/enhanced-card';
import { Checkbox } from '@/components/ui/checkbox';
import { useHaptics } from '@/hooks/useHaptics';

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
  layout?: 'grid' | 'list';
  isSelected?: boolean;
  onSelect?: (document: Document) => void;
  className?: string;
  disabled?: boolean;
  showMetadata?: boolean;
  showCheckbox?: boolean;
  onSelectionToggle?: (docId: string) => void;
  searchQuery?: string;
  onEdit?: (doc: any) => void;
  onDuplicate?: (doc: Document) => Promise<void>;
  onDelete?: (docId: any) => void;
}

// Loading skeleton component
const DocumentCardSkeleton: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <Card variant="elevated" className="animate-pulse">
    <CardContent padding={compact ? "xs" : "sm"}>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-6 h-6 bg-muted rounded-lg"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded-lg w-3/4"></div>
              <div className="h-3 bg-muted/70 rounded-lg w-1/2"></div>
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
  layout = 'grid',
  isSelected = false, 
  onSelect,
  className = '',
  disabled = false,
  showMetadata = true,
  showCheckbox = false,
  onSelectionToggle
}) => {
  const { impactLight } = useHaptics();
  const [longPressTimer, setLongPressTimer] = React.useState<NodeJS.Timeout | null>(null);
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
  const handleCardClick = useCallback(() => {
    if (disabled) return;
    // In selection mode, toggle selection instead of opening document
    if (showCheckbox && onSelectionToggle) {
      onSelectionToggle(document.id);
      impactLight();
    } else {
      onSelect?.(document);
    }
  }, [document, onSelect, disabled, showCheckbox, onSelectionToggle, impactLight]);

  // Long press handlers for mobile selection
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled || showCheckbox) return;
    
    // Start long press timer (500ms)
    const timer = setTimeout(() => {
      if (onSelectionToggle) {
        onSelectionToggle(document.id);
        impactLight();
        e.preventDefault();
      }
    }, 500);
    
    setLongPressTimer(timer);
  }, [disabled, showCheckbox, onSelectionToggle, document.id, impactLight]);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  }, [longPressTimer]);

  // Clean up timer on unmount
  React.useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  // Memoized keyboard handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick();
    }
  }, [handleCardClick, disabled]);

  // Memoized card classes with enhanced styling
  const cardClasses = clsx(
    // Base layout classes
    'group cursor-pointer transition-all duration-200 ease-out',
    
    // Size variants
    compact && 'text-sm',
    
    // Layout variants
    layout === 'list' && 'w-full',
    layout === 'grid' && 'aspect-[4/3]',
    
    // Interaction states with enhanced shadows and transforms
    !disabled && 'hover:shadow-xl hover:scale-[1.02] hover:border-primary/30',
    disabled && 'opacity-60 cursor-not-allowed',
    
    // Selection states with enhanced visuals
    isSelected && !disabled && 'ring-2 ring-primary/60 bg-primary/8 shadow-lg scale-[1.01] border-primary/40',
    !isSelected && !disabled && 'shadow-md hover:shadow-xl',
    
    // Focus states
    'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
    
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

  // Format file size helper
  const formatFileSize = useCallback((bytes?: number): string => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }, []);

  // Format date helper
  const formatDate = useCallback((date?: Date): string => {
    if (!date) return '';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }, []);

  // Get document icon based on type
  const getDocumentIcon = useCallback((type?: string): string => {
    const iconMap: Record<string, string> = {
      'pdf': '📄',
      'doc': '📝',
      'docx': '📝',
      'xls': '📊',
      'xlsx': '📊',
      'ppt': '📽️',
      'pptx': '📽️',
      'txt': '📃',
      'image': '🖼️',
      'video': '🎥',
      'audio': '🎵'
    };
    return iconMap[type?.toLowerCase() || ''] || '📄';
  }, []);

  // Generate content preview from document content
  const getContentPreview = useCallback((content?: string): string => {
    if (!content || content.trim().length === 0) return '';
    
    // Remove markdown formatting and extra whitespace
    const cleanContent = content
      .replace(/[#*`_~\[\]]/g, '') // Remove markdown syntax
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .trim();
    
    // Return first 50-80 characters with word boundary
    if (cleanContent.length <= 80) return cleanContent;
    
    const truncated = cleanContent.substring(0, 80);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    return lastSpaceIndex > 50 
      ? truncated.substring(0, lastSpaceIndex) + '...'
      : truncated + '...';
  }, []);

  // Helper function for word count formatting
  const formatWordCount = useCallback((count: number): string => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  }, []);

  // Render horizontal list layout
  if (layout === 'list') {
    return (
      <Card 
        variant="interactive"
        padding="sm"
        className={cardClasses}
        onClick={handleCardClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-selected={isSelected}
        aria-label={ariaLabel}
        aria-disabled={disabled}
      >
        <CardContent padding="none" className="p-4">
          <div className="flex items-center gap-4">
            {/* Checkbox for selection mode */}
            {(showCheckbox || isSelected) && (
              <div className="flex-shrink-0">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => {
                    onSelectionToggle?.(document.id);
                    impactLight();
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="h-5 w-5 border-2 shadow-sm"
                  aria-label={`Select document ${document.title}`}
                />
              </div>
            )}

            {/* Document Icon/Thumbnail - Larger in list view */}
            <div className="flex-shrink-0">
              {document.thumbnail ? (
                <img 
                  src={document.thumbnail} 
                  alt=""
                  className="object-cover rounded-lg w-14 h-14 shadow-sm ring-1 ring-border/20"
                  loading="lazy"
                />
              ) : (
                <div className="flex items-center justify-center w-14 h-14 text-2xl bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg shadow-sm ring-1 ring-border/20">
                  {getDocumentIcon(document.type)}
                </div>
              )}
            </div>

            {/* Document Info - Improved for horizontal layout */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate text-lg leading-tight mb-1">
                {document.title || 'Untitled Document'}
              </h3>
              
              {document.description && (
                <p className="text-sm text-muted-foreground truncate mb-1">
                  {document.description}
                </p>
              )}
              
              {/* Content Preview - Better for list view */}
              {getContentPreview(document.content) && (
                <p className="text-sm text-muted-foreground/90 mt-2 line-clamp-2 leading-relaxed">
                  {getContentPreview(document.content)}
                </p>
              )}
            </div>

            {/* Metadata in list view - Only show on medium+ screens */}
            {showMetadata && (
              <div className="hidden md:flex flex-col items-end gap-2 text-sm text-muted-foreground flex-shrink-0 bg-surface/50 rounded-lg p-3 shadow-sm">
                {document.word_count && (
                  <span className="font-medium text-foreground">
                    {formatWordCount(document.word_count)} words
                  </span>
                )}
                {document.lastModified && (
                  <span>
                    {formatDate(document.lastModified)}
                  </span>
                )}
              </div>
            )}

            {/* Selection Indicator */}
            {isSelected && (
              <div className="flex-shrink-0 rounded-full bg-primary flex items-center justify-center w-5 h-5">
                <svg 
                  className="text-primary-foreground w-3 h-3"
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path 
                    fillRule="evenodd" 
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                    clipRule="evenodd" 
                  />
                </svg>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render grid layout (original design with enhanced styling)
  return (
    <Card 
      variant="elevated"
      padding={compact ? "xs" : "sm"}
      className={cardClasses}
      onClick={handleCardClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-selected={isSelected}
      aria-label={ariaLabel}
      aria-disabled={disabled}
    >
      <CardContent padding="none" className={contentClasses}>
        <div className={compact ? "space-y-2" : "space-y-3"}>
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            {/* Checkbox for selection mode */}
            {(showCheckbox || isSelected) && (
              <div className="flex-shrink-0 pt-1">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => {
                    onSelectionToggle?.(document.id);
                    impactLight();
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="h-5 w-5 border-2 shadow-sm"
                  aria-label={`Select document ${document.title}`}
                />
              </div>
            )}

            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Document Icon */}
              <div className="flex-shrink-0">
                {document.thumbnail ? (
                  <img 
                    src={document.thumbnail} 
                    alt=""
                    className={`object-cover rounded-lg shadow-sm ring-1 ring-border/20 ${compact ? 'w-8 h-8' : 'w-10 h-10'}`}
                    loading="lazy"
                  />
                ) : (
                  <div className={`flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg shadow-sm ring-1 ring-border/20 ${compact ? 'w-8 h-8 text-lg' : 'w-10 h-10 text-xl'}`}>
                    {getDocumentIcon(document.type)}
                  </div>
                )}
              </div>

              {/* Document Info */}
              <div className="flex-1 min-w-0">
                <h3 className={`font-semibold text-foreground truncate leading-tight mb-1 ${
                  compact ? 'text-sm' : 'text-base'
                }`}>
                  {document.title || 'Untitled Document'}
                </h3>
                
                {document.description && !compact && (
                  <p className="text-sm text-muted-foreground truncate mb-1">
                    {document.description}
                  </p>
                )}
                
                {/* Content Preview */}
                {getContentPreview(document.content) && (
                  <p className={`text-muted-foreground/80 mt-1 line-clamp-2 leading-relaxed ${
                    compact ? 'text-xs' : 'text-sm'
                  }`}>
                    {getContentPreview(document.content)}
                  </p>
                )}
              </div>
            </div>

            {/* Selection Indicator */}
            {isSelected && (
              <div className={`flex-shrink-0 rounded-full bg-primary shadow-sm flex items-center justify-center ${compact ? 'w-5 h-5' : 'w-6 h-6'}`}>
                <svg 
                  className={`text-primary-foreground ${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'}`}
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path 
                    fillRule="evenodd" 
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                    clipRule="evenodd" 
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Metadata */}
          {showMetadata && !compact && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground bg-surface/30 rounded-lg p-2 mt-3">
              {document.word_count && (
                <span className="font-medium text-foreground">
                  {formatWordCount(document.word_count)} words
                </span>
              )}
              
              {document.type && (
                <span className="uppercase font-medium text-xs">
                  {document.type}
                </span>
              )}
              
              {document.size && (
                <span className="text-xs">
                  {formatFileSize(document.size)}
                </span>
              )}
              
              {document.lastModified && (
                <span className="text-xs">
                  {formatDate(document.lastModified)}
                </span>
              )}
            </div>
          )}

          {/* Compact metadata */}
          {showMetadata && compact && (document.word_count || document.type || document.size) && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-surface/30 rounded p-1.5 mt-2">
              {document.word_count && (
                <span className="font-medium">
                  {formatWordCount(document.word_count)}w
                </span>
              )}
              {document.type && document.word_count && <span>•</span>}
              {document.type && (
                <span className="uppercase font-medium">
                  {document.type}
                </span>
              )}
              {document.size && (document.type || document.word_count) && <span>•</span>}
              {document.size && (
                <span>
                  {formatFileSize(document.size)}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

});

// Set display name for better debugging
DocumentCard.displayName = 'DocumentCard';

// Export types for external use
export type { Document, DocumentCardProps };