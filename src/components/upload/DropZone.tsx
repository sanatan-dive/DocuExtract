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
      className={`
        relative p-12 border-2 border-dashed rounded-2xl text-center cursor-pointer
        transition-all duration-200
        ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-indigo-400 hover:bg-indigo-50/50'}
        ${isDragActive && !isDragReject ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-gray-50'}
        ${isDragReject ? 'border-red-500 bg-red-50' : ''}
      `}
    >
      <input {...getInputProps()} />
      
      <div className={`
        w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center
        ${isDragReject ? 'bg-red-100 text-red-500' : 'bg-indigo-100 text-indigo-600'}
      `}>
        {isDragReject ? <AlertCircle className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
      </div>
      
      <p className="text-lg font-semibold text-gray-800 mb-2">
        {isDragActive
          ? isDragReject
            ? 'Invalid file type'
            : 'Drop files here'
          : 'Drag & drop PDF files here'}
      </p>
      
      <p className="text-sm text-gray-500">
        or click to browse • Max {maxSizeMB}MB per file • Up to {maxFiles} files
      </p>
      
      <div className="flex items-center justify-center gap-2 mt-4">
        <FileText className="w-4 h-4 text-gray-400" />
        <span className="text-xs text-gray-400">PDF files only</span>
      </div>
    </div>
  );
}

export default DropZone;
