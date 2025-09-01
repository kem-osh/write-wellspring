import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UploadFile, UploadState, UploadResult, UploadError } from '../types/upload';
import { readFileAsText, validateFile, BATCH_SIZE } from '../utils/fileProcessor';

const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;

export function useFileUpload() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [uploadState, setUploadState] = useState<UploadState>({
    files: [],
    overallProgress: 0,
    isUploading: false,
    completedCount: 0,
    failedCount: 0
  });

  const updateFileStatus = useCallback((fileId: string, status: UploadFile['status'], error?: string, documentId?: string) => {
    setUploadState(prev => ({
      ...prev,
      files: prev.files.map(file => 
        file.id === fileId 
          ? { ...file, status, error, documentId, progress: status === 'complete' ? 100 : file.progress }
          : file
      )
    }));
  }, []);

  const updateOverallProgress = useCallback(() => {
    setUploadState(prev => {
      const completedCount = prev.files.filter(f => f.status === 'complete').length;
      const failedCount = prev.files.filter(f => f.status === 'error').length;
      const totalFiles = prev.files.length;
      const overallProgress = totalFiles > 0 ? ((completedCount + failedCount) / totalFiles) * 100 : 0;
      
      return {
        ...prev,
        overallProgress,
        completedCount,
        failedCount
      };
    });
  }, []);

  const processFile = async (uploadFile: UploadFile, attempt: number = 1): Promise<UploadResult> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      // Validate file
      const validation = validateFile(uploadFile.file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      updateFileStatus(uploadFile.id, 'uploading');
      
      // Read file content
      const content = await readFileAsText(uploadFile.file);
      
      if (!content.trim()) {
        throw new Error('File is empty or contains no readable text');
      }

      updateFileStatus(uploadFile.id, 'processing');
      
      // Call Supabase function
      const { data, error } = await supabase.functions.invoke('process-uploaded-document', {
        body: {
          file_content: content,
          file_name: uploadFile.file.name,
          user_id: user.id
        }
      });
      
      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown upload error');
      }
      
      updateFileStatus(uploadFile.id, 'complete', undefined, data.document.id);
      return data;
      
    } catch (error: any) {
      console.error(`File upload error (attempt ${attempt}):`, error);
      
      // Retry logic for retryable errors
      const isRetryable = attempt < RETRY_ATTEMPTS && (
        error.message?.includes('network') ||
        error.message?.includes('timeout') ||
        error.message?.includes('rate limit')
      );
      
      if (isRetryable) {
        const delay = RETRY_DELAY * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        return processFile(uploadFile, attempt + 1);
      }
      
      updateFileStatus(uploadFile.id, 'error', error.message);
      throw error;
    }
  };

  const processBatch = async (files: UploadFile[]): Promise<PromiseSettledResult<UploadResult>[]> => {
    const batch = files.slice(0, BATCH_SIZE);
    const promises = batch.map(file => processFile(file));
    return Promise.allSettled(promises);
  };

  const uploadFiles = useCallback(async (files: File[]) => {
    if (!user) {
      toast({ title: "Error", description: "Please log in to upload files", variant: "destructive" });
      return;
    }

    // Convert files to UploadFile objects
    const uploadFiles: UploadFile[] = files.map(file => ({
      id: crypto.randomUUID(),
      file,
      status: 'queued',
      progress: 0
    }));

    setUploadState({
      files: uploadFiles,
      overallProgress: 0,
      isUploading: true,
      completedCount: 0,
      failedCount: 0
    });

    try {
      // Process files in batches
      const allFiles = [...uploadFiles];
      
      while (allFiles.length > 0) {
        const queuedFiles = allFiles.filter(f => f.status === 'queued');
        if (queuedFiles.length === 0) break;
        
        const batch = queuedFiles.slice(0, BATCH_SIZE);
        await processBatch(batch);
        
        // Remove processed files from queue
        allFiles.splice(0, Math.min(BATCH_SIZE, allFiles.length));
        
        // Update progress
        updateOverallProgress();
      }

    } catch (error: any) {
      console.error('Batch upload error:', error);
      toast({ 
        title: "Upload Error", 
        description: "Some files failed to upload. Check individual file status for details.", 
        variant: "destructive" 
      });
    } finally {
      setUploadState(prev => ({ ...prev, isUploading: false }));
      updateOverallProgress();
      
      // Show completion toast
      const completed = uploadState.files.filter(f => f.status === 'complete').length;
      const failed = uploadState.files.filter(f => f.status === 'error').length;
      
      if (completed > 0) {
        toast({ 
          title: "Upload Complete", 
          description: `${completed} files uploaded successfully${failed > 0 ? `, ${failed} failed` : ''}` 
        });
      }
    }
  }, [user, toast, updateOverallProgress, uploadState.files]);

  const retryFailed = useCallback(async () => {
    const failedFiles = uploadState.files.filter(f => f.status === 'error');
    
    if (failedFiles.length === 0) return;

    // Reset failed files to queued
    setUploadState(prev => ({
      ...prev,
      files: prev.files.map(file => 
        file.status === 'error' 
          ? { ...file, status: 'queued', error: undefined }
          : file
      ),
      isUploading: true
    }));

    // Retry processing
    try {
      for (const file of failedFiles) {
        await processFile(file);
        updateOverallProgress();
      }
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setUploadState(prev => ({ ...prev, isUploading: false }));
      updateOverallProgress();
    }
  }, [uploadState.files, updateOverallProgress]);

  const retryFile = useCallback(async (fileId: string) => {
    const file = uploadState.files.find(f => f.id === fileId);
    if (!file || file.status !== 'error') return;

    updateFileStatus(fileId, 'queued');
    
    try {
      await processFile(file);
    } catch (error) {
      console.error('Individual retry failed:', error);
    }
    
    updateOverallProgress();
  }, [uploadState.files, updateFileStatus, updateOverallProgress]);

  const clearCompleted = useCallback(() => {
    setUploadState(prev => ({
      ...prev,
      files: prev.files.filter(f => f.status !== 'complete')
    }));
    updateOverallProgress();
  }, [updateOverallProgress]);

  const clearAll = useCallback(() => {
    setUploadState({
      files: [],
      overallProgress: 0,
      isUploading: false,
      completedCount: 0,
      failedCount: 0
    });
  }, []);

  return {
    uploadState,
    uploadFiles,
    retryFailed,
    retryFile,
    clearCompleted,
    clearAll,
    updateOverallProgress
  };
}