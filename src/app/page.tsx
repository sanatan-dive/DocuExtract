'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Settings,
  HelpCircle,
  LayoutDashboard,
  FileUp,
  FolderOpen,
  BarChart3,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { UploadManager } from '@/components/upload/UploadManager';
import { DataTable, ExportControls, MetricsPanel, DocumentDetailModal } from '@/components/dashboard';
import { DocumentWithRelations, CostSummary } from '@/types';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

type TabType = 'dashboard' | 'upload' | 'documents' | 'metrics';

export default function Dashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [documents, setDocuments] = useState<DocumentWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<DocumentWithRelations | null>(null);
  const [stats, setStats] = useState<{
    statusCounts: Record<string, number>;
    costSummary?: CostSummary;
  }>({ statusCounts: {} });
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = () => {
    Cookies.remove('auth_token');
    router.push('/login');
  };

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/documents?limit=1000');
      const result = await response.json();
      
      if (result.success) {
        setDocuments(result.data);
        setStats({
          statusCounts: result.stats?.statusCounts || {},
          costSummary: result.stats?.costSummary,
        });
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    if (activeTab === 'documents') {
      const interval = setInterval(fetchDocuments, 30000);
      return () => clearInterval(interval);
    }
  }, [activeTab, fetchDocuments]);

  const handleUploadComplete = useCallback((documentIds: string[]) => {
    console.log('Upload complete:', documentIds);
    fetchDocuments();
    setTimeout(() => setActiveTab('documents'), 1000);
  }, [fetchDocuments]);

  const handleUpdateDocument = async (id: string, data: any) => {
    const response = await fetch(`/api/documents?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (response.ok) {
      fetchDocuments();
    }
  };

  const handleReExtract = async (id: string, forceModel?: string) => {
    await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: id, forceModel, skipClassification: !!forceModel }),
    });
    fetchDocuments();
  };

  const totalDocuments = documents.length;
  const completedDocuments = stats.statusCounts['COMPLETED'] || 0;
  const failedDocuments = stats.statusCounts['FAILED'] || 0;
  const pendingDocuments = totalDocuments - completedDocuments - failedDocuments;

  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload' as const, label: 'Upload', icon: FileUp },
    { id: 'documents' as const, label: 'Documents', icon: FolderOpen },
    { id: 'metrics' as const, label: 'Metrics', icon: BarChart3 },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AnimatePresence>
        {selectedDocument && (
          <div className="fixed inset-0 z-50">
            <DocumentDetailModal 
              document={selectedDocument} 
              onClose={() => setSelectedDocument(null)}
              onSave={handleUpdateDocument}
              onReExtract={handleReExtract}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 fixed h-screen overflow-y-auto p-4">
        <div className="flex items-center gap-3 px-3 mb-8">
          <motion.div 
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.5 }}
            className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white"
          >
            <FileText className="w-5 h-5" />
          </motion.div>
          <span className="font-bold text-lg text-gray-900">DocuExtract</span>
        </div>

        <nav className="space-y-1 mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">Menu</p>
          {navItems.map(item => (
            <motion.button
              key={item.id}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.id 
                  ? 'bg-indigo-50 text-indigo-600' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </motion.button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-gray-100 space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
            <Settings className="w-5 h-5" />
            Settings
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
            <HelpCircle className="w-5 h-5" />
            Help & Support
          </button>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-60 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              key={activeTab}
              className="text-2xl font-bold text-gray-900"
            >
              {activeTab === 'dashboard' && 'Dashboard'}
              {activeTab === 'upload' && 'Upload Documents'}
              {activeTab === 'documents' && 'Documents'}
              {activeTab === 'metrics' && 'Metrics & Analytics'}
            </motion.h1>
            <p className="text-gray-500 mt-1">
              {activeTab === 'dashboard' && 'Overview of your document processing'}
              {activeTab === 'upload' && 'Upload PDFs for AI-powered data extraction'}
              {activeTab === 'documents' && 'View and manage extracted data'}
              {activeTab === 'metrics' && 'Track costs and performance'}
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchDocuments}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </motion.button>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && (
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-6"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <motion.div variants={itemVariants} className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-5 text-white shadow-lg">
                    <p className="text-indigo-100 text-sm font-medium">Total Documents</p>
                    <p className="text-3xl font-bold mt-2">{totalDocuments}</p>
                    <p className="text-indigo-200 text-sm mt-2">All time</p>
                  </motion.div>
                  <motion.div variants={itemVariants} className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white shadow-lg">
                    <p className="text-emerald-100 text-sm font-medium">Completed</p>
                    <p className="text-3xl font-bold mt-2">{completedDocuments}</p>
                    <p className="text-emerald-200 text-sm mt-2">
                      {totalDocuments > 0 ? Math.round((completedDocuments / totalDocuments) * 100) : 0}% success rate
                    </p>
                  </motion.div>
                  <motion.div variants={itemVariants} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                    <p className="text-gray-500 text-sm font-medium">Pending</p>
                    <p className="text-3xl font-bold mt-2 text-gray-900">{pendingDocuments}</p>
                    <p className="text-gray-400 text-sm mt-2">In queue</p>
                  </motion.div>
                  <motion.div variants={itemVariants} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                    <p className="text-gray-500 text-sm font-medium">Failed</p>
                    <p className="text-3xl font-bold mt-2 text-gray-900">{failedDocuments}</p>
                    <p className={`text-sm mt-2 ${failedDocuments > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                      {failedDocuments > 0 ? 'Needs attention' : 'All good'}
                    </p>
                  </motion.div>
                </div>

                {/* Cost Summary */}
                {stats.costSummary && (
                  <motion.div variants={itemVariants} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Summary</h3>
                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <p className="text-gray-500 text-sm">Total Cost</p>
                        <p className="text-2xl font-bold text-gray-900">${stats.costSummary.totalCost.toFixed(4)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-sm">Avg. per Document</p>
                        <p className="text-2xl font-bold text-gray-900">${stats.costSummary.averageCostPerDocument.toFixed(6)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-sm">Batch Savings</p>
                        <p className="text-2xl font-bold text-emerald-600">${stats.costSummary.batchSavings.toFixed(4)}</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Recent Activity */}
                <motion.div variants={itemVariants} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Documents</h3>
                    <button 
                      onClick={() => setActiveTab('documents')}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      View All
                    </button>
                  </div>
                  <div className="space-y-3">
                    {documents.slice(0, 5).map(doc => (
                      <div key={doc.id} className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
                        <div 
                          className={`w-2 h-2 rounded-full mt-2 ${
                            doc.status === 'COMPLETED' ? 'bg-emerald-500' :
                            doc.status === 'FAILED' ? 'bg-red-500' : 'bg-amber-500'
                          }`}
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{doc.originalName}</p>
                          <p className="text-xs text-gray-500">
                            {doc.status} • {new Date(doc.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    {documents.length === 0 && (
                      <p className="text-gray-500 py-4 text-center">
                        No documents yet. Upload some PDFs to get started.
                      </p>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}

            {activeTab === 'upload' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-2xl mx-auto"
              >
                <UploadManager onUploadComplete={handleUploadComplete} />
              </motion.div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <ExportControls data={documents} />
                </div>
                <DataTable 
                  data={documents}
                  onViewDocument={(doc) => setSelectedDocument(doc)}
                />
              </div>
            )}

            {activeTab === 'metrics' && (
              <MetricsPanel
                totalDocuments={totalDocuments}
                completedDocuments={completedDocuments}
                failedDocuments={failedDocuments}
                pendingDocuments={pendingDocuments}
                costSummary={stats.costSummary}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
