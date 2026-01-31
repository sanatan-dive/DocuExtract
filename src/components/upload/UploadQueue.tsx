'use client';

import React from 'react';
import {
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  RotateCcw,
} from 'lucide-react';
import { UploadProgress } from '@/types';

interface UploadQueueProps {
  items: UploadProgress[];
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}

export function UploadQueue({ items, onRetry, onRemove }: UploadQueueProps) {
  if (items.length === 0) return null;

  const completed = items.filter(i => i.status === 'complete').length;
  const failed = items.filter(i => i.status === 'error').length;
  const processing = items.filter(i => ['uploading', 'processing'].includes(i.status)).length;
  const progressPercent = items.length > 0 ? (completed / items.length) * 100 : 0;

  return (
    <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Upload Queue</h3>
          <p className="text-sm text-gray-500 mt-1">
            {completed} completed • {processing} processing • {failed} failed
          </p>
        </div>
        <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Items */}
      <div className="flex flex-col gap-2">
        {items.map(item => (
          <UploadQueueItem
            key={item.id}
            item={item}
            onRetry={() => onRetry(item.id)}
            onRemove={() => onRemove(item.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface UploadQueueItemProps {
  item: UploadProgress;
  onRetry: () => void;
  onRemove: () => void;
}

function UploadQueueItem({ item, onRetry, onRemove }: UploadQueueItemProps) {
  const statusConfig = {
    pending: { icon: FileText, badgeClass: 'bg-blue-100 text-blue-700', label: 'Pending' },
    uploading: { icon: Loader2, badgeClass: 'bg-blue-100 text-blue-700', label: 'Uploading' },
    processing: { icon: Loader2, badgeClass: 'bg-amber-100 text-amber-700', label: 'Processing' },
    complete: { icon: CheckCircle, badgeClass: 'bg-emerald-100 text-emerald-700', label: 'Complete' },
    error: { icon: AlertCircle, badgeClass: 'bg-red-100 text-red-700', label: 'Failed' },
  };

  const config = statusConfig[item.status];
  const StatusIcon = config.icon;
  const isAnimated = ['uploading', 'processing'].includes(item.status);

  const iconColorClass = 
    item.status === 'complete' ? 'text-emerald-500' :
    item.status === 'error' ? 'text-red-500' : 'text-gray-400';

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <StatusIcon className={`w-5 h-5 shrink-0 ${iconColorClass} ${isAnimated ? 'animate-spin' : ''}`} />
      
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">{item.fileName}</div>
        
        {item.errorMessage && (
          <div className="text-xs text-red-500 mt-0.5">{item.errorMessage}</div>
        )}
        
        {isAnimated && (
          <div className="h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
            <div 
              className="h-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${item.progress}%` }} 
            />
          </div>
        )}
      </div>

      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.badgeClass}`}>
        {config.label}
      </span>

      {item.status === 'error' && (
        <button 
          onClick={onRetry} 
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      )}

      <button 
        onClick={onRemove} 
        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
        disabled={isAnimated}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default UploadQueue;
