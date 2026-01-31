'use client';

import React from 'react';
import { Download, FileJson, FileSpreadsheet, FileText } from 'lucide-react';
import { DocumentWithRelations, ExportFormat } from '@/types';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface ExportControlsProps {
  data: DocumentWithRelations[];
}

export function ExportControls({ data }: ExportControlsProps) {
  const exportData = (format: ExportFormat) => {
    const exportRows = data.map(doc => ({
      id: doc.id,
      file_name: doc.originalName,
      status: doc.status,
      classification: doc.classification || '',
      name: doc.extractedData?.name || '',
      address: doc.extractedData?.address || '',
      postalcode: doc.extractedData?.postalcode || '',
      city: doc.extractedData?.city || '',
      birthday: doc.extractedData?.birthday || '',
      date: doc.extractedData?.date || '',
      time: doc.extractedData?.time || '',
      handwritten: doc.extractedData?.handwritten ? 'Yes' : 'No',
      signed: doc.extractedData?.signed ? 'Yes' : 'No',
      stamp: doc.extractedData?.stamp || '',
      overall_confidence: doc.extractedData?.overallConfidence 
        ? `${Math.round(doc.extractedData.overallConfidence * 100)}%` 
        : '',
      needs_review: doc.extractedData?.needsReview ? 'Yes' : 'No',
      processed_at: doc.processingCompletedAt?.toISOString() || '',
    }));

    switch (format) {
      case 'csv':
        exportCsv(exportRows);
        break;
      case 'json':
        exportJson(exportRows);
        break;
      case 'xlsx':
        exportExcel(exportRows);
        break;
    }
  };

  const exportCsv = (rows: Record<string, string>[]) => {
    const csv = Papa.unparse(rows);
    downloadFile(csv, 'docuextract-export.csv', 'text/csv');
  };

  const exportJson = (rows: Record<string, string>[]) => {
    const json = JSON.stringify(rows, null, 2);
    downloadFile(json, 'docuextract-export.json', 'application/json');
  };

  const exportExcel = (rows: Record<string, string>[]) => {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Extracted Data');
    
    const colWidths = Object.keys(rows[0] || {}).map(key => ({
      wch: Math.max(key.length, 15)
    }));
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, 'docuextract-export.xlsx');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500 mr-2">Export:</span>
      
      <button
        onClick={() => exportData('csv')}
        className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <FileText className="w-4 h-4" />
        CSV
      </button>

      <button
        onClick={() => exportData('json')}
        className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <FileJson className="w-4 h-4" />
        JSON
      </button>

      <button
        onClick={() => exportData('xlsx')}
        className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <FileSpreadsheet className="w-4 h-4" />
        Excel
      </button>
    </div>
  );
}

export default ExportControls;
