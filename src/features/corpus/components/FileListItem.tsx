import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { UploadFile } from '../types/upload';
import { formatFileSize } from '../utils/fileProcessor';

function FileStatusIcon({ status }: { status: UploadFile['status'] }) {
  switch (status) {
    case 'queued':
      return <FileText className="w-4 h-4 text-muted-foreground" />;
    case 'uploading':
    case 'processing':
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    case 'complete':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'error':
      return <XCircle className="w-4 h-4 text-red-500" />;
    default:
      return <FileText className="w-4 h-4 text-muted-foreground" />;
  }
}

function FileStatusBadge({ status }: { status: UploadFile['status'] }) {
  const variants: Record<UploadFile['status'], any> = {
    queued: 'secondary',
    uploading: 'default',
    processing: 'default',
    complete: 'success',
    error: 'destructive'
  };

  const labels: Record<UploadFile['status'], string> = {
    queued: 'Queued',
    uploading: 'Uploading',
    processing: 'Processing',
    complete: 'Complete',
    error: 'Failed'
  };

  return (
    <Badge variant={variants[status]} className="text-xs">
      {labels[status]}
    </Badge>
  );
}

interface FileListItemProps {
  file: UploadFile;
  isUploading: boolean;
  onRetry: (fileId: string) => void;
  showSeparator: boolean;
}

const FileListItem = memo(({ file, isUploading, onRetry, showSeparator }: FileListItemProps) => {
  return (
    <>
      <div className="flex items-center justify-between p-3 rounded-lg border">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <FileStatusIcon status={file.status} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {file.file.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(file.file.size)}
            </p>
            {file.error && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {file.error}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FileStatusBadge status={file.status} />
          {file.status === 'error' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRetry(file.id)}
              disabled={isUploading}
              aria-label={`Retry upload for ${file.file.name}`}
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
      {showSeparator && <Separator className="my-2" />}
    </>
  );
});

FileListItem.displayName = 'FileListItem';

export { FileListItem };