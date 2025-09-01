export interface UploadFile {
  id: string;
  file: File;
  status: 'queued' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  error?: string;
  documentId?: string;
}

export interface UploadState {
  files: UploadFile[];
  overallProgress: number;
  isUploading: boolean;
  completedCount: number;
  failedCount: number;
}

export type UploadError = {
  type: 'NETWORK_ERROR' | 'FILE_ERROR' | 'API_ERROR' | 'VALIDATION_ERROR';
  message: string;
  retryable: boolean;
  file_id: string;
}

export interface UploadResult {
  success: boolean;
  document?: {
    id: string;
    title: string;
    word_count: number;
    embedding_generated: boolean;
  };
  error?: string;
  error_code?: string;
}

export interface BulkUploaderProps {
  onUploadComplete?: (successCount: number, failCount: number) => void;
  onDocumentAdded?: (document: any) => void;
  onClose?: () => void;
}