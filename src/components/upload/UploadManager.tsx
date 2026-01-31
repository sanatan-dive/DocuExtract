'use client';

import React, { useState, useCallback } from 'react';
import { DropZone } from './DropZone';
import { UploadQueue } from './UploadQueue';
import { UploadProgress } from '@/types';
import { generateFileName } from '@/lib/utils';

interface UploadManagerProps {
  onUploadComplete?: (documentIds: string[]) => void;
}

export function UploadManager({ onUploadComplete }: UploadManagerProps) {
  const [queue, setQueue] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFilesAccepted = useCallback((files: File[]) => {
    const newItems: UploadProgress[] = files.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fileName: file.name,
      progress: 0,
      status: 'pending' as const,
    }));

    setQueue(prev => [...prev, ...newItems]);
    
    // Start uploading
    processQueue([...queue, ...newItems], files);
  }, [queue]);

  const processQueue = async (items: UploadProgress[], files: File[]) => {
    if (isUploading) return;
    setIsUploading(true);

    const pendingItems = items.filter(i => i.status === 'pending');
    const completedIds: string[] = [];

    for (const item of pendingItems) {
      const file = files.find(f => f.name === item.fileName);
      if (!file) continue;

      // Update to uploading
      setQueue(prev => prev.map(i => 
        i.id === item.id ? { ...i, status: 'uploading' as const, progress: 10 } : i
      ));

      try {
        // Create form data
        const formData = new FormData();
        formData.append('file', file);

        // Upload with progress simulation
        setQueue(prev => prev.map(i => 
          i.id === item.id ? { ...i, progress: 50 } : i
        ));

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (result.success) {
          setQueue(prev => prev.map(i => 
            i.id === item.id 
              ? { ...i, status: 'processing' as const, progress: 75 } 
              : i
          ));

          // Trigger extraction
          if (result.documentId) {
            await fetch('/api/extract', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ documentId: result.documentId }),
            });
            completedIds.push(result.documentId);
          }

          setQueue(prev => prev.map(i => 
            i.id === item.id 
              ? { ...i, status: 'complete' as const, progress: 100 } 
              : i
          ));
        } else {
          throw new Error(result.error || 'Upload failed');
        }

      } catch (error) {
        setQueue(prev => prev.map(i => 
          i.id === item.id 
            ? { 
                ...i, 
                status: 'error' as const, 
                errorMessage: error instanceof Error ? error.message : 'Unknown error' 
              } 
            : i
        ));
      }
    }

    setIsUploading(false);
    
    if (completedIds.length > 0 && onUploadComplete) {
      onUploadComplete(completedIds);
    }
  };

  const handleRetry = useCallback((id: string) => {
    setQueue(prev => prev.map(i => 
      i.id === id ? { ...i, status: 'pending' as const, progress: 0, errorMessage: undefined } : i
    ));
  }, []);

  const handleRemove = useCallback((id: string) => {
    setQueue(prev => prev.filter(i => i.id !== id));
  }, []);

  return (
    <div>
      <DropZone
        onFilesAccepted={handleFilesAccepted}
        disabled={isUploading}
        maxFiles={50}
        maxSizeMB={50}
      />
      
      <UploadQueue
        items={queue}
        onRetry={handleRetry}
        onRemove={handleRemove}
      />
    </div>
  );
}

export default UploadManager;
