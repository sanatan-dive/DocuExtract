'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  BarChart,
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
import { DocumentWithRelations, UploadProgress, CostSummary } from '@/types';
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
      const interval = setInterval(fetchDocuments, 30000); // Poll every 30s
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

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="app-layout">
      <AnimatePresence>
        {selectedDocument && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
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
      <aside className="sidebar">
        <div className="logo">
          <motion.div 
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.5 }}
            className="logo-icon"
          >
            <FileText className="w-5 h-5" />
          </motion.div>
          <span className="logo-text">DocuExtract</span>
        </div>

        <nav className="nav-section">
          <div className="nav-section-title">Menu</div>
          {navItems.map(item => (
            <motion.div
              key={item.id}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <item.icon />
              {item.label}
            </motion.div>
          ))}
        </nav>

        <nav className="nav-section" style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
          <motion.div whileHover={{ x: 4 }} className="nav-item">
            <Settings />
            Settings
          </motion.div>
          <motion.div whileHover={{ x: 4 }} className="nav-item">
            <HelpCircle />
            Help & Support
          </motion.div>
          <motion.div 
            whileHover={{ x: 4 }}
            className="nav-item"
            onClick={handleLogout}
            style={{ cursor: 'pointer', color: 'var(--accent-red)' }}
          >
            <LogOut />
            Logout
          </motion.div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <div className="header">
          <div>
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              key={activeTab} // Re-animate on tab change
              className="header-title"
            >
              {activeTab === 'dashboard' && 'Dashboard'}
              {activeTab === 'upload' && 'Upload Documents'}
              {activeTab === 'documents' && 'Documents'}
              {activeTab === 'metrics' && 'Metrics & Analytics'}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="header-subtitle"
            >
              {activeTab === 'dashboard' && 'Overview of your document processing'}
              {activeTab === 'upload' && 'Upload PDFs for AI-powered data extraction'}
              {activeTab === 'documents' && 'View and manage extracted data'}
              {activeTab === 'metrics' && 'Track costs and performance'}
            </motion.p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchDocuments}
            disabled={isLoading}
            className="btn btn-secondary"
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
            className="animate-fadeIn"
          >
            {activeTab === 'dashboard' && (
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-6"
              >
                {/* Stats Grid */}
                <div className="stats-grid">
                  <motion.div variants={itemVariants} className="stat-card blue">
                    <div className="stat-label">Total Documents</div>
                    <div className="stat-value">{totalDocuments}</div>
                    <div className="stat-change" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      All time
                    </div>
                  </motion.div>
                  <motion.div variants={itemVariants} className="stat-card green">
                    <div className="stat-label">Completed</div>
                    <div className="stat-value">{completedDocuments}</div>
                    <div className="stat-change" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      {totalDocuments > 0 ? Math.round((completedDocuments / totalDocuments) * 100) : 0}% success rate
                    </div>
                  </motion.div>
                  <motion.div variants={itemVariants} className="stat-card">
                    <div className="stat-label">Pending</div>
                    <div className="stat-value">{pendingDocuments}</div>
                    <div className="stat-change">In queue</div>
                  </motion.div>
                  <motion.div variants={itemVariants} className="stat-card">
                    <div className="stat-label">Failed</div>
                    <div className="stat-value">{failedDocuments}</div>
                    <div className="stat-change negative">
                      {failedDocuments > 0 ? 'Needs attention' : 'All good'}
                    </div>
                  </motion.div>
                </div>

                {/* Cost Summary */}
                {stats.costSummary && (
                  <motion.div variants={itemVariants} className="card">
                    <div className="card-header">
                      <h3 className="card-title">Cost Summary</h3>
                    </div>
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                      <div>
                        <div className="stat-label">Total Cost</div>
                        <div className="stat-value" style={{ fontSize: '24px' }}>
                          ${stats.costSummary.totalCost.toFixed(4)}
                        </div>
                      </div>
                      <div>
                        <div className="stat-label">Avg. per Document</div>
                        <div className="stat-value" style={{ fontSize: '24px' }}>
                          ${stats.costSummary.averageCostPerDocument.toFixed(6)}
                        </div>
                      </div>
                      <div>
                        <div className="stat-label">Batch Savings</div>
                        <div className="stat-value" style={{ fontSize: '24px', color: 'var(--accent-green)' }}>
                          ${stats.costSummary.batchSavings.toFixed(4)}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Recent Activity */}
                <motion.div variants={itemVariants} className="card">
                  <div className="card-header">
                    <h3 className="card-title">Recent Documents</h3>
                    <button 
                      className="btn btn-ghost"
                      onClick={() => setActiveTab('documents')}
                    >
                      View All
                    </button>
                  </div>
                  {documents.slice(0, 5).map(doc => (
                    <div key={doc.id} className="activity-item">
                      <div 
                        className="activity-dot"
                        style={{
                          backgroundColor: 
                            doc.status === 'COMPLETED' ? 'var(--accent-green)' :
                            doc.status === 'FAILED' ? 'var(--accent-red)' :
                            'var(--accent-orange)'
                        }}
                      />
                      <div className="activity-content">
                        <div className="activity-title">{doc.originalName}</div>
                        <div className="activity-time">
                          {doc.status} • {new Date(doc.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  {documents.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', padding: '20px 0' }}>
                      No documents yet. Upload some PDFs to get started.
                    </p>
                  )}
                </motion.div>
              </motion.div>
            )}

            {activeTab === 'upload' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ maxWidth: '700px', margin: '0 auto' }}
              >
                <UploadManager onUploadComplete={handleUploadComplete} />
              </motion.div>
            )}

            {activeTab === 'documents' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <ExportControls data={documents} />
                </div>
                <DataTable 
                  data={documents}
                  onViewDocument={(doc) => setSelectedDocument(doc)}
                />
              </motion.div>
            )}

            {activeTab === 'metrics' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <MetricsPanel
                  totalDocuments={totalDocuments}
                  completedDocuments={completedDocuments}
                  failedDocuments={failedDocuments}
                  pendingDocuments={pendingDocuments}
                  costSummary={stats.costSummary}
                />
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
