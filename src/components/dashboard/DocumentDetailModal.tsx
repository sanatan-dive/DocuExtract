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

  const getConfidenceClass = (field: string) => {
    const score = confidenceScores?.[field];
    if (score === undefined) return 'border-gray-200';
    if (score > 0.8) return 'border-emerald-500';
    if (score > 0.5) return 'border-amber-500';
    return 'border-red-500';
  };

  const pdfUrl = `/api/file?name=${encodeURIComponent(document.fileName)}`;
  const overallConfidence = document.extractedData?.overallConfidence || 0;
  const confidenceColorClass = overallConfidence > 0.8 ? 'text-emerald-600' : overallConfidence > 0.5 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Review Document</h2>
            <p className="text-sm text-gray-500">
              {document.originalName} • {document.classification || 'Unknown Type'} • Model: {document.modelUsed || 'N/A'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Re-Extract Dropdown */}
            {onReExtract && (
              <div className="relative group">
                <button
                  disabled={isReExtracting}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  onClick={() => handleReExtract()}
                >
                  <RotateCcw className={`w-4 h-4 ${isReExtracting ? 'animate-spin' : ''}`} />
                  {isReExtracting ? 'Re-Extracting...' : 'Re-Extract'}
                </button>
                <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <button 
                    onClick={() => handleReExtract('gemini-2.5-flash')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                  >
                    <Zap className="w-3 h-3 text-amber-500" />
                    Force Flash (Fast)
                  </button>
                  <button 
                    onClick={() => handleReExtract('gemini-2.5-pro')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                  >
                    <Cpu className="w-3 h-3 text-indigo-500" />
                    Force Pro (Accurate)
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save & Verify'}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* PDF View (Left) */}
          <div className="w-1/2 bg-gray-100 border-r border-gray-200 overflow-hidden">
            <iframe 
              src={pdfUrl}
              className="w-full h-full"
              title="PDF Preview"
              style={{ border: 'none' }}
            />
          </div>

          {/* Form (Right) */}
          <div className="w-1/2 p-6 overflow-y-auto bg-white">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Extracted Data
            </h3>
            
            {/* Confidence Summary */}
            <div className="mb-6 p-3 rounded-lg bg-gray-50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Overall Confidence</span>
                <span className={`font-semibold ${confidenceColorClass}`}>
                  {Math.round(overallConfidence * 100)}%
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              <FormField 
                label="Name" 
                value={formData.name as string} 
                onChange={v => handleChange('name', v)}
                confidenceClass={getConfidenceClass('name')}
              />
              <div className="grid grid-cols-2 gap-4">
                 <FormField 
                  label="Date" 
                  value={formData.date as string} 
                  onChange={v => handleChange('date', v)}
                  confidenceClass={getConfidenceClass('date')}
                />
                 <FormField 
                  label="Time" 
                  value={formData.time as string} 
                  onChange={v => handleChange('time', v)}
                  confidenceClass={getConfidenceClass('time')}
                />
              </div>
              <FormField 
                label="Address" 
                value={formData.address as string} 
                onChange={v => handleChange('address', v)}
                confidenceClass={getConfidenceClass('address')}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField 
                  label="Postal Code" 
                  value={formData.postalcode as string} 
                  onChange={v => handleChange('postalcode', v)}
                  confidenceClass={getConfidenceClass('postalcode')}
                />
                <FormField 
                  label="City" 
                  value={formData.city as string} 
                  onChange={v => handleChange('city', v)}
                  confidenceClass={getConfidenceClass('city')}
                />
              </div>
               <FormField 
                  label="Date of Birth" 
                  value={formData.birthday as string} 
                  onChange={v => handleChange('birthday', v)}
                  confidenceClass={getConfidenceClass('birthday')}
                />
              
              <div className="pt-4 border-t border-gray-100 mt-6">
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
                  confidenceClass={getConfidenceClass('stamp')}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, confidenceClass }: { 
  label: string, 
  value: string, 
  onChange: (val: string) => void,
  confidenceClass: string 
}) {
  return (
    <div className="relative">
      <label className="block text-xs font-medium text-gray-500 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className={`w-full px-3 py-2.5 bg-white border-2 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${confidenceClass}`}
        />
      </div>
    </div>
  );
}

function Checkbox({ label, checked, onChange }: { label: string, checked: boolean, onChange: (val: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
      <input 
        type="checkbox" 
        checked={checked || false}
        onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
      />
      {label}
    </label>
  );
}

export default DocumentDetailModal;
