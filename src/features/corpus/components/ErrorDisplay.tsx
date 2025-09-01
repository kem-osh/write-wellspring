import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  RotateCcw, 
  XCircle, 
  Wifi,
  Server,
  AlertCircle,
  FileX
} from 'lucide-react';
import { UploadFile, UploadError } from '../types/upload';

interface ErrorDisplayProps {
  files: UploadFile[];
  onRetryFile: (fileId: string) => void;
  onRetryAll: () => void;
  isRetrying?: boolean;
}

function getErrorIcon(errorMessage: string) {
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return <Wifi className="w-4 h-4" />;
  }
  if (errorMessage.includes('server') || errorMessage.includes('API')) {
    return <Server className="w-4 h-4" />;
  }
  if (errorMessage.includes('file') || errorMessage.includes('empty')) {
    return <FileX className="w-4 h-4" />;
  }
  return <AlertCircle className="w-4 h-4" />;
}

function getErrorCategory(errorMessage: string): { 
  category: string; 
  retryable: boolean; 
  suggestion: string;
} {
  const message = errorMessage.toLowerCase();
  
  if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
    return {
      category: 'Network Error',
      retryable: true,
      suggestion: 'Check your internet connection and try again.'
    };
  }
  
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return {
      category: 'Rate Limit',
      retryable: true,
      suggestion: 'Wait a moment and try again. The system is busy.'
    };
  }
  
  if (message.includes('openai') || message.includes('embedding')) {
    return {
      category: 'AI Processing Error',
      retryable: true,
      suggestion: 'The AI service is temporarily unavailable. Try again later.'
    };
  }
  
  if (message.includes('file') || message.includes('empty') || message.includes('size')) {
    return {
      category: 'File Error',
      retryable: false,
      suggestion: 'Check the file format and size, then try uploading again.'
    };
  }
  
  if (message.includes('database') || message.includes('db')) {
    return {
      category: 'Database Error',
      retryable: true,
      suggestion: 'Temporary database issue. Please try again.'
    };
  }
  
  return {
    category: 'Unknown Error',
    retryable: true,
    suggestion: 'An unexpected error occurred. Try again or contact support.'
  };
}

export function ErrorDisplay({ files, onRetryFile, onRetryAll, isRetrying = false }: ErrorDisplayProps) {
  const errorFiles = files.filter(f => f.status === 'error');
  
  if (errorFiles.length === 0) {
    return null;
  }
  
  const retryableErrors = errorFiles.filter(f => {
    const { retryable } = getErrorCategory(f.error || '');
    return retryable;
  });
  
  const permanentErrors = errorFiles.filter(f => {
    const { retryable } = getErrorCategory(f.error || '');
    return !retryable;
  });

  return (
    <div className="space-y-4">
      {/* Retryable Errors */}
      {retryableErrors.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <div>
                  <CardTitle className="text-yellow-800 dark:text-yellow-200">
                    {retryableErrors.length} {retryableErrors.length === 1 ? 'File Failed' : 'Files Failed'}
                  </CardTitle>
                  <CardDescription className="text-yellow-700 dark:text-yellow-300">
                    These files can be retried
                  </CardDescription>
                </div>
              </div>
              <Button 
                onClick={onRetryAll}
                disabled={isRetrying}
                variant="outline"
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-700 dark:text-yellow-300"
              >
                {isRetrying ? (
                  <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4 mr-2" />
                )}
                Retry All ({retryableErrors.length})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-48">
              <div className="space-y-3">
                {retryableErrors.map((file, index) => {
                  const errorInfo = getErrorCategory(file.error || '');
                  return (
                    <div key={file.id}>
                      <div className="flex items-start justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="text-yellow-600 mt-0.5">
                            {getErrorIcon(file.error || '')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-gray-900 dark:text-gray-100">
                              {file.file.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs border-yellow-300 text-yellow-700">
                                {errorInfo.category}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                              {errorInfo.suggestion}
                            </p>
                            {file.error && (
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 font-mono bg-gray-100 dark:bg-gray-800 p-1 rounded">
                                {file.error}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRetryFile(file.id)}
                          disabled={isRetrying}
                          className="text-yellow-700 hover:bg-yellow-100 dark:text-yellow-300 dark:hover:bg-yellow-900/20"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      </div>
                      {index < retryableErrors.length - 1 && <Separator className="my-2" />}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Permanent Errors */}
      {permanentErrors.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <div>
                <CardTitle className="text-red-800 dark:text-red-200">
                  {permanentErrors.length} {permanentErrors.length === 1 ? 'File Cannot Be Processed' : 'Files Cannot Be Processed'}
                </CardTitle>
                <CardDescription className="text-red-700 dark:text-red-300">
                  These files have permanent issues and need to be fixed manually
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-48">
              <div className="space-y-3">
                {permanentErrors.map((file, index) => {
                  const errorInfo = getErrorCategory(file.error || '');
                  return (
                    <div key={file.id}>
                      <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg border">
                        <div className="text-red-600 mt-0.5">
                          {getErrorIcon(file.error || '')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-gray-900 dark:text-gray-100">
                            {file.file.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="destructive" className="text-xs">
                              {errorInfo.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            {errorInfo.suggestion}
                          </p>
                          {file.error && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 font-mono bg-gray-100 dark:bg-gray-800 p-1 rounded">
                              {file.error}
                            </p>
                          )}
                        </div>
                      </div>
                      {index < permanentErrors.length - 1 && <Separator className="my-2" />}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}