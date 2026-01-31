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

  return (
    <div className="card" style={{ marginTop: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 className="card-title">Upload Queue</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {completed} completed • {processing} processing • {failed} failed
          </p>
        </div>
        <div className="progress-bar" style={{ width: '120px' }}>
          <div 
            className="progress-fill"
            style={{ width: `${(completed / items.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
    pending: { icon: FileText, badge: 'badge-info', label: 'Pending' },
    uploading: { icon: Loader2, badge: 'badge-info', label: 'Uploading' },
    processing: { icon: Loader2, badge: 'badge-warning', label: 'Processing' },
    complete: { icon: CheckCircle, badge: 'badge-success', label: 'Complete' },
    error: { icon: AlertCircle, badge: 'badge-error', label: 'Failed' },
  };

  const config = statusConfig[item.status];
  const StatusIcon = config.icon;
  const isAnimated = ['uploading', 'processing'].includes(item.status);

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '12px',
      padding: '12px',
      background: 'var(--bg-tertiary)',
      borderRadius: '8px',
    }}>
      <StatusIcon 
        className={`w-5 h-5 ${isAnimated ? 'animate-spin' : ''}`}
        style={{ 
          color: item.status === 'complete' ? 'var(--accent-green)' : 
                 item.status === 'error' ? 'var(--accent-red)' : 
                 'var(--text-secondary)',
          flexShrink: 0,
        }}
      />
      
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          fontSize: '14px', 
          fontWeight: 500,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {item.fileName}
        </div>
        
        {item.errorMessage && (
          <div style={{ fontSize: '12px', color: 'var(--accent-red)', marginTop: '2px' }}>
            {item.errorMessage}
          </div>
        )}
        
        {isAnimated && (
          <div className="progress-bar" style={{ marginTop: '6px' }}>
            <div className="progress-fill" style={{ width: `${item.progress}%` }} />
          </div>
        )}
      </div>

      <span className={`badge ${config.badge}`}>{config.label}</span>

      {item.status === 'error' && (
        <button onClick={onRetry} className="btn btn-ghost" style={{ padding: '6px' }}>
          <RotateCcw className="w-4 h-4" />
        </button>
      )}

      <button 
        onClick={onRemove} 
        className="btn btn-ghost" 
        style={{ padding: '6px' }}
        disabled={isAnimated}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default UploadQueue;
