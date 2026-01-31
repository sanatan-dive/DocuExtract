'use client';

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle } from 'lucide-react';

interface DropZoneProps {
  onFilesAccepted: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  disabled?: boolean;
}

export function DropZone({
  onFilesAccepted,
  maxFiles = 50,
  maxSizeMB = 50,
  disabled = false,
}: DropZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFilesAccepted(acceptedFiles);
      }
    },
    [onFilesAccepted]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles,
    maxSize: maxSizeMB * 1024 * 1024,
    disabled,
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={`upload-zone ${isDragActive ? 'active' : ''}`}
      style={{
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        borderColor: isDragReject ? 'var(--accent-red)' : undefined,
        background: isDragReject ? 'var(--accent-red-light)' : undefined,
      }}
    >
      <input {...getInputProps()} />
      
      <div className="upload-zone-icon">
        {isDragReject ? <AlertCircle /> : <Upload />}
      </div>
      
      <p className="upload-zone-title">
        {isDragActive
          ? isDragReject
            ? 'Invalid file type'
            : 'Drop files here'
          : 'Drag & drop PDF files here'}
      </p>
      
      <p className="upload-zone-subtitle">
        or click to browse • Max {maxSizeMB}MB per file • Up to {maxFiles} files
      </p>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
        <FileText className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          PDF files only
        </span>
      </div>
    </div>
  );
}

export default DropZone;
