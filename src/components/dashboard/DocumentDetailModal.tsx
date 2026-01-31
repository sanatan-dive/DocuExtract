'use client';

import React, { useState } from 'react';
import { X, Save, RotateCcw, Zap, Cpu } from 'lucide-react';
import { DocumentWithRelations, ExtractedDataType } from '@/types';

interface DocumentDetailModalProps {
  document: DocumentWithRelations;
  onClose: () => void;
  onSave: (id: string, data: Partial<ExtractedDataType>) => Promise<void>;
  onReExtract?: (id: string, forceModel?: string) => Promise<void>;
}

export function DocumentDetailModal({ document, onClose, onSave, onReExtract }: DocumentDetailModalProps) {
  const [formData, setFormData] = useState<Partial<ExtractedDataType>>(
    document.extractedData || {}
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isReExtracting, setIsReExtracting] = useState(false);

  const handleChange = (field: keyof ExtractedDataType, value: any) => {
    setFormData((prev: Partial<ExtractedDataType>) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(document.id, formData);
      onClose();
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReExtract = async (forceModel?: string) => {
    if (!onReExtract) return;
    setIsReExtracting(true);
    try {
      await onReExtract(document.id, forceModel);
      onClose();
    } catch (error) {
      console.error('Re-extraction failed:', error);
    } finally {
      setIsReExtracting(false);
    }
  };

  const confidenceScores = document.extractedData?.confidenceScores as Record<string, number> | undefined;

  const getAccuracyColor = (field: string) => {
    const score = confidenceScores?.[field];
    if (score === undefined) return 'var(--border-color)';
    if (score > 0.8) return 'var(--accent-green)';
    if (score > 0.5) return 'var(--accent-orange)';
    return 'var(--accent-red)';
  };

  // Compute PDF URL for preview
  const pdfUrl = `/api/file?name=${encodeURIComponent(document.fileName)}`;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200" style={{ borderColor: 'var(--border-color)' }}>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Review Document
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {document.originalName} • {document.classification || 'Unknown Type'} • Model: {document.modelUsed || 'N/A'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Re-Extract Dropdown */}
            {onReExtract && (
              <div className="relative group">
                <button
                  disabled={isReExtracting}
                  className="btn btn-secondary"
                  onClick={() => handleReExtract()}
                >
                  <RotateCcw className={`w-4 h-4 ${isReExtracting ? 'animate-spin' : ''}`} />
                  {isReExtracting ? 'Re-Extracting...' : 'Re-Extract'}
                </button>
                <div className="absolute right-0 mt-1 w-48 bg-white border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                  <button 
                    onClick={() => handleReExtract('gemini-2.5-flash')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Zap className="w-3 h-3" style={{ color: 'var(--accent-orange)' }} />
                    Force Flash (Fast)
                  </button>
                  <button 
                    onClick={() => handleReExtract('gemini-2.5-pro')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Cpu className="w-3 h-3" style={{ color: 'var(--primary)' }} />
                    Force Pro (Accurate)
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="btn btn-primary"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save & Verify'}
            </button>
            <button
              onClick={onClose}
              className="btn btn-ghost"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* PDF View (Left) */}
          <div className="w-1/2 bg-gray-100 border-r overflow-hidden" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}>
            <iframe 
              src={pdfUrl}
              className="w-full h-full"
              title="PDF Preview"
              style={{ border: 'none' }}
            />
          </div>

          {/* Form (Right) */}
          <div className="w-1/2 p-6 overflow-y-auto bg-white" style={{ background: 'var(--bg-secondary)' }}>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
              Extracted Data
            </h3>
            
            {/* Confidence Summary */}
            <div className="mb-6 p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--text-secondary)' }}>Overall Confidence</span>
                <span className="font-semibold" style={{ 
                  color: (document.extractedData?.overallConfidence || 0) > 0.8 ? 'var(--accent-green)' : 
                         (document.extractedData?.overallConfidence || 0) > 0.5 ? 'var(--accent-orange)' : 'var(--accent-red)'
                }}>
                  {Math.round((document.extractedData?.overallConfidence || 0) * 100)}%
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              <FormField 
                label="Name" 
                value={formData.name as string} 
                onChange={v => handleChange('name', v)}
                confidenceColor={getAccuracyColor('name')}
              />
              <div className="grid grid-cols-2 gap-4">
                 <FormField 
                  label="Date" 
                  value={formData.date as string} 
                  onChange={v => handleChange('date', v)}
                  confidenceColor={getAccuracyColor('date')}
                />
                 <FormField 
                  label="Time" 
                  value={formData.time as string} 
                  onChange={v => handleChange('time', v)}
                  confidenceColor={getAccuracyColor('time')}
                />
              </div>
              <FormField 
                label="Address" 
                value={formData.address as string} 
                onChange={v => handleChange('address', v)}
                confidenceColor={getAccuracyColor('address')}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField 
                  label="Postal Code" 
                  value={formData.postalcode as string} 
                  onChange={v => handleChange('postalcode', v)}
                  confidenceColor={getAccuracyColor('postalcode')}
                />
                <FormField 
                  label="City" 
                  value={formData.city as string} 
                  onChange={v => handleChange('city', v)}
                  confidenceColor={getAccuracyColor('city')}
                />
              </div>
               <FormField 
                  label="Date of Birth" 
                  value={formData.birthday as string} 
                  onChange={v => handleChange('birthday', v)}
                  confidenceColor={getAccuracyColor('birthday')}
                />
              
              <div className="pt-4 border-t border-gray-100 mt-6" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-4 mb-2">
                  <Checkbox 
                    label="Handwritten" 
                    checked={formData.handwritten as boolean} 
                    onChange={v => handleChange('handwritten', v)}
                  />
                  <Checkbox 
                    label="Signed" 
                    checked={formData.signed as boolean} 
                    onChange={v => handleChange('signed', v)}
                  />
                </div>
                 <FormField 
                  label="Stamp Detected" 
                  value={formData.stamp as string} 
                  onChange={v => handleChange('stamp', v)}
                  confidenceColor={getAccuracyColor('stamp')}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, confidenceColor }: { 
  label: string, 
  value: string, 
  onChange: (val: string) => void,
  confidenceColor: string 
}) {
  return (
    <div className="relative">
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className="input-field w-full pl-3 pr-8"
          style={{ borderRightWidth: '4px', borderRightColor: confidenceColor }}
        />
      </div>
    </div>
  );
}

function Checkbox({ label, checked, onChange }: { label: string, checked: boolean, onChange: (val: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
      <input 
        type="checkbox" 
        checked={checked || false}
        onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-gray-300"
      />
      {label}
    </label>
  );
}

export default DocumentDetailModal;
