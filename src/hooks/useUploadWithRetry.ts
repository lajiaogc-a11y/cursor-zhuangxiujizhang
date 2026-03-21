import { useState, useCallback, useRef } from 'react';
import { uploadFileToStorage } from '@/services/settings.service';

interface UploadState {
  uploading: boolean;
  progress: number;
  error: string | null;
  retryCount: number;
}

interface UseUploadWithRetryOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  bucket?: string;
}

export function useUploadWithRetry(options: UseUploadWithRetryOptions = {}) {
  const { maxRetries = 3, retryDelayMs = 1000, bucket = 'receipts' } = options;
  
  const [state, setState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    error: null,
    retryCount: 0,
  });
  
  const abortRef = useRef(false);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const uploadWithRetry = useCallback(async (
    file: File,
    folder: string,
    entityId: string
  ): Promise<string | null> => {
    abortRef.current = false;
    setState({ uploading: true, progress: 0, error: null, retryCount: 0 });

    const fileExt = file.name.split('.').pop();
    const uniqueId = crypto.randomUUID();
    const fileName = `${folder}/${entityId}/${uniqueId}.${fileExt}`;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (abortRef.current) {
        setState(prev => ({ ...prev, uploading: false, error: 'Upload cancelled' }));
        return null;
      }

      try {
        setState(prev => ({ ...prev, retryCount: attempt, progress: 0 }));

        // Simulate progress
        const progressInterval = setInterval(() => {
          if (!abortRef.current) {
            setState(prev => ({ ...prev, progress: Math.min(prev.progress + 15, 90) }));
          }
        }, 100);

        await uploadFileToStorage(bucket, fileName, file);

        clearInterval(progressInterval);

        setState({ uploading: false, progress: 100, error: null, retryCount: attempt });
        return fileName;

      } catch (error: any) {
        lastError = error;
        console.error(`Upload attempt ${attempt + 1} failed:`, error);

        if (attempt < maxRetries && !abortRef.current) {
          // Wait before retry with exponential backoff
          const waitTime = retryDelayMs * Math.pow(2, attempt);
          setState(prev => ({ 
            ...prev, 
            progress: 0, 
            error: `Retry ${attempt + 1}/${maxRetries}...` 
          }));
          await delay(waitTime);
        }
      }
    }

    // All retries exhausted
    setState({ 
      uploading: false, 
      progress: 0, 
      error: lastError?.message || 'Upload failed after retries',
      retryCount: maxRetries 
    });
    return null;
  }, [bucket, maxRetries, retryDelayMs]);

  const cancelUpload = useCallback(() => {
    abortRef.current = true;
  }, []);

  const resetState = useCallback(() => {
    setState({ uploading: false, progress: 0, error: null, retryCount: 0 });
  }, []);

  return {
    ...state,
    uploadWithRetry,
    cancelUpload,
    resetState,
  };
}
