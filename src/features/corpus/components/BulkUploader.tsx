import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  RotateCcw,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { useFileUpload } from '../hooks/useFileUpload';
import { BulkUploaderProps, UploadFile } from '../types/upload';
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
    complete: 'default',
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

export function BulkUploader({ onUploadComplete, onDocumentAdded, onClose }: BulkUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  
  const {
    uploadState,
    uploadFiles,
    retryFailed,
    retryFile,
    clearCompleted,
    clearAll
  } = useFileUpload();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      uploadFiles(files);
    }
  }, [uploadFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFiles(Array.from(files));
    }
    // Reset input value to allow selecting same files again
    e.target.value = '';
  }, [uploadFiles]);

  const getStatusCounts = () => {
    const counts = {
      queued: 0,
      uploading: 0,
      processing: 0,
      complete: 0,
      error: 0
    };
    
    uploadState.files.forEach(file => {
      counts[file.status]++;
    });
    
    return counts;
  };

  const statusCounts = getStatusCounts();
  const hasFiles = uploadState.files.length > 0;
  const hasFailedFiles = statusCounts.error > 0;
  const hasCompletedFiles = statusCounts.complete > 0;

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <Card className={`transition-colors ${isDragOver ? 'border-primary bg-primary/5' : ''}`}>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Upload className="w-5 h-5" />
            Bulk Document Upload
          </CardTitle>
          <CardDescription>
            Drag and drop files here or click to select. Supports .txt, .md, .doc, .docx files up to 10MB each.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className={`mx-auto mb-4 w-12 h-12 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
            <div className="space-y-2">
              <p className="text-lg font-medium">
                {isDragOver ? 'Drop files here' : 'Select files to upload'}
              </p>
              <p className="text-sm text-muted-foreground">
                Upload multiple documents to build your corpus
              </p>
              <input
                type="file"
                id="file-upload"
                className="hidden"
                multiple
                accept=".txt,.md,.doc,.docx"
                onChange={handleFileSelect}
                disabled={uploadState.isUploading}
              />
              <Button 
                asChild 
                disabled={uploadState.isUploading}
                className="mt-4"
              >
                <label htmlFor="file-upload" className="cursor-pointer">
                  Choose Files
                </label>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Overview */}
      {hasFiles && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Upload Progress</CardTitle>
              <div className="flex gap-2">
                {hasFailedFiles && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={retryFailed}
                    disabled={uploadState.isUploading}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Retry Failed ({statusCounts.error})
                  </Button>
                )}
                {hasCompletedFiles && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearCompleted}
                    disabled={uploadState.isUploading}
                  >
                    Clear Completed
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowClearDialog(true)}
                  disabled={uploadState.isUploading}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              </div>
            </div>
            <CardDescription>
              {uploadState.files.length} files • {statusCounts.complete} completed • {statusCounts.error} failed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Overall Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{Math.round(uploadState.overallProgress)}%</span>
              </div>
              <Progress value={uploadState.overallProgress} className="h-2" />
            </div>

            {/* Status Summary */}
            <div className="flex gap-2 flex-wrap">
              {statusCounts.complete > 0 && (
                <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {statusCounts.complete} Complete
                </Badge>
              )}
              {(statusCounts.uploading + statusCounts.processing) > 0 && (
                <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  {statusCounts.uploading + statusCounts.processing} Processing
                </Badge>
              )}
              {statusCounts.queued > 0 && (
                <Badge variant="secondary">
                  {statusCounts.queued} Queued
                </Badge>
              )}
              {statusCounts.error > 0 && (
                <Badge variant="destructive">
                  <XCircle className="w-3 h-3 mr-1" />
                  {statusCounts.error} Failed
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* File List */}
      {hasFiles && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">File Details</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {uploadState.files.map((file, index) => (
                  <div key={file.id}>
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
                            onClick={() => retryFile(file.id)}
                            disabled={uploadState.isUploading}
                          >
                            <RotateCcw className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {index < uploadState.files.length - 1 && <Separator className="my-2" />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Clear All Confirmation Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Files?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all files from the upload queue. Completed uploads will remain in your document library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                clearAll();
                setShowClearDialog(false);
              }}
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}