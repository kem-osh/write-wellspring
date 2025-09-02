import React, { useCallback, useMemo } from 'react';
import { clsx } from 'clsx';
import { Card, CardContent } from '@/components/ui/card';

// TypeScript interfaces for better type safety
interface Document {
  id: string;
  title: string;
  description?: string;
  type?: string;
  size?: number;
  lastModified?: Date;
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
}

// Loading skeleton component
const DocumentCardSkeleton: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <Card variant={compact ? "mobile" : "elevated"} className="animate-pulse">
    <CardContent padding={compact ? "xs" : "sm"}>
      <div className={`space-y-${compact ? '2' : '4'}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-8 h-8 bg-gray-200 rounded"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
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

  // Memoized variant
  const cardVariant = useMemo(() => compact ? "mobile" : "elevated", [compact]);

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
      variant={cardVariant}
      className={cardClasses}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-selected={isSelected}
      aria-label={ariaLabel}
      aria-disabled={disabled}
    >
      <CardContent padding={compact ? "xs" : "sm"}>
        <div className={`space-y-${compact ? '2' : '4'}`}>
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Document Icon */}
              <div className="flex-shrink-0">
                {document.thumbnail ? (
                  <img 
                    src={document.thumbnail} 
                    alt=""
                    className="w-8 h-8 object-cover rounded"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-8 h-8 flex items-center justify-center text-lg">
                    {getDocumentIcon(document.type)}
                  </div>
                )}
              </div>

              {/* Document Info */}
              <div className="flex-1 min-w-0">
                <h3 className={`font-medium text-gray-900 truncate ${
                  compact ? 'text-sm' : 'text-base'
                }`}>
                  {document.title || 'Untitled Document'}
                </h3>
                
                {document.description && !compact && (
                  <p className="text-sm text-gray-600 truncate mt-1">
                    {document.description}
                  </p>
                )}
              </div>
            </div>

            {/* Selection Indicator */}
            {isSelected && (
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <svg 
                  className="w-3 h-3 text-white" 
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
            <div className="flex items-center gap-4 text-xs text-gray-500">
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
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {document.type && (
                <span className="uppercase font-medium">
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