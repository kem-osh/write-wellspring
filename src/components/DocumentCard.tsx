import React, { useCallback, useMemo } from 'react';
import { clsx } from 'clsx';
import { Card, CardContent } from '@/components/ui/card';

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
  onEdit?: (doc: any) => void;
  onDuplicate?: (doc: Document) => Promise<void>;
  onDelete?: (docId: any) => void;
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
  className = '',
  disabled = false,
  showMetadata = true
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
  const handleCardClick = useCallback(() => {
    if (disabled) return;
    onSelect?.(document);
  }, [document, onSelect, disabled]);

  // Memoized keyboard handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick();
    }
  }, [handleCardClick, disabled]);

  // Memoized class names
  const cardClasses = clsx(
    // Base styles
    'group transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
    
    // Cursor and interaction states
    disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
    
    // Hover effects based on compact mode
    !disabled && (compact ? 'hover:shadow-sm' : 'hover:shadow-lg hover:-translate-y-0.5'),
    
    // Selection states
    isSelected && !disabled && 'ring-2 ring-primary/50 bg-primary/5 shadow-md',
    !isSelected && !disabled && 'hover:shadow-md',
    
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

  return (
    <Card 
      className={cardClasses}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-selected={isSelected}
      aria-label={ariaLabel}
      aria-disabled={disabled}
    >
      <CardContent className={contentClasses}>
        <div className={`space-y-${compact ? '1' : '2'}`}>
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* Document Icon */}
              <div className="flex-shrink-0">
                {document.thumbnail ? (
                  <img 
                    src={document.thumbnail} 
                    alt=""
                    className={`object-cover rounded ${compact ? 'w-6 h-6' : 'w-8 h-8'}`}
                    loading="lazy"
                  />
                ) : (
                  <div className={`flex items-center justify-center ${compact ? 'w-6 h-6 text-sm' : 'w-8 h-8 text-lg'}`}>
                    {getDocumentIcon(document.type)}
                  </div>
                )}
              </div>

              {/* Document Info */}
              <div className="flex-1 min-w-0">
                <h3 className={`font-medium text-foreground truncate ${
                  compact ? 'text-sm' : 'text-base'
                }`}>
                  {document.title || 'Untitled Document'}
                </h3>
                
                {document.description && !compact && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {document.description}
                  </p>
                )}
              </div>
            </div>

            {/* Selection Indicator */}
            {isSelected && (
              <div className={`flex-shrink-0 rounded-full bg-primary flex items-center justify-center ${compact ? 'w-4 h-4' : 'w-5 h-5'}`}>
                <svg 
                  className={`text-primary-foreground ${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'}`}
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
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {document.type && (
                <span className="uppercase font-medium">
                  {document.type}
                </span>
              )}
              
              {document.size && (
                <span>
                  {formatFileSize(document.size)}
                </span>
              )}
              
              {document.lastModified && (
                <span>
                  Modified {formatDate(document.lastModified)}
                </span>
              )}
            </div>
          )}

          {/* Compact metadata */}
          {showMetadata && compact && (document.type || document.size) && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {document.type && (
                <span className="uppercase font-medium text-xs">
                  {document.type}
                </span>
              )}
              {document.type && document.size && <span>•</span>}
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