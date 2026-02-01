'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Sun,
  Bell,
  RefreshCw,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { UploadManager } from '@/components/upload/UploadManager';
import { DataTable, ExportControls, MetricsPanel, DocumentDetailModal, Sidebar, NotificationsPanel } from '@/components/dashboard';
import { DocumentWithRelations, CostSummary } from '@/types';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

type TabType = 'dashboard' | 'upload' | 'documents' | 'metrics' | 'profile' | 'account' | 'corporate' | 'blog' | 'social';

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
  const [showNotifications, setShowNotifications] = useState(true);

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
  const successRate = totalDocuments > 0 ? ((completedDocuments / totalDocuments) * 100).toFixed(1) : '0';

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--color-bg-primary)' }}>
      {/* Document Detail Modal */}
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
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as TabType)}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main 
        className="flex-1 p-6 overflow-y-auto"
        style={{ marginLeft: 'var(--sidebar-width)', marginRight: showNotifications ? '280px' : '0' }}
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="search-bar" style={{ width: '320px' }}>
              <Search className="w-4 h-4 text-[var(--color-text-muted)]" />
              <input type="text" placeholder="Search" />
              <div className="search-shortcut">⌘/</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors">
              <Sun className="w-5 h-5 text-[var(--color-text-secondary)]" />
            </button>
            <button className="p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors">
              <Bell className="w-5 h-5 text-[var(--color-text-secondary)]" />
            </button>
            <button
              onClick={fetchDocuments}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-primary)] transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Header */}
                <div>
                  <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">eCommerce</h1>
                </div>

                {/* Stat Cards - Top Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="stat-card stat-card--blue">
                    <p className="text-sm font-medium text-[var(--stat-blue-text)]">Documents</p>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-2xl font-bold text-[var(--color-text-primary)]">{totalDocuments.toLocaleString()}</span>
                      <span className="text-xs text-green-600 flex items-center gap-0.5">
                        <TrendingUp className="w-3 h-3" />
                        +11.01%
                      </span>
                    </div>
                  </div>
                  
                  <div className="stat-card" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                    <p className="text-sm font-medium text-[var(--color-text-secondary)]">Completed</p>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-2xl font-bold text-[var(--color-text-primary)]">{completedDocuments.toLocaleString()}</span>
                      <span className="text-xs text-red-500 flex items-center gap-0.5">
                        <TrendingDown className="w-3 h-3" />
                        -0.03%
                      </span>
                    </div>
                  </div>
                  
                  <div className="stat-card stat-card--blue">
                    <p className="text-sm font-medium text-[var(--stat-blue-text)]">Success Rate</p>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-2xl font-bold text-[var(--color-text-primary)]">{successRate}%</span>
                      <span className="text-xs text-green-600 flex items-center gap-0.5">
                        <TrendingUp className="w-3 h-3" />
                        +15.03%
                      </span>
                    </div>
                  </div>
                  
                  <div className="stat-card" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                    <p className="text-sm font-medium text-[var(--color-text-secondary)]">Processing</p>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-2xl font-bold text-[var(--color-text-primary)]">{pendingDocuments}</span>
                      <span className="text-xs text-green-600 flex items-center gap-0.5">
                        <TrendingUp className="w-3 h-3" />
                        +6.08%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Processing Progress Chart */}
                  <div className="chart-container">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-[var(--color-text-primary)]">Processing Status</h3>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          Completed {completedDocuments}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          Pending {pendingDocuments}
                        </span>
                      </div>
                    </div>
                    <div className="h-32 flex items-end gap-2">
                      {/* Simple bar chart visualization */}
                      {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, i) => (
                        <div key={month} className="flex-1 flex flex-col items-center gap-1">
                          <div 
                            className="w-full bg-gray-200 rounded-t"
                            style={{ height: `${20 + Math.random() * 80}%` }}
                          >
                            <div 
                              className="w-full bg-[var(--stat-blue-text)] rounded-t"
                              style={{ height: `${50 + Math.random() * 50}%` }}
                            />
                          </div>
                          <span className="text-xs text-[var(--color-text-muted)]">{month}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cost Breakdown */}
                  <div className="chart-container">
                    <h3 className="font-semibold text-[var(--color-text-primary)] mb-4">Cost by Model</h3>
                    {stats.costSummary ? (
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-[var(--color-text-secondary)]">Total Cost</span>
                          <span className="font-medium">${stats.costSummary.totalCost.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[var(--color-text-secondary)]">Avg per Document</span>
                          <span className="font-medium">${stats.costSummary.averageCostPerDocument.toFixed(6)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[var(--color-text-secondary)]">Batch Savings</span>
                          <span className="font-medium text-green-600">${stats.costSummary.batchSavings.toFixed(4)}</span>
                        </div>
                        {Object.entries(stats.costSummary.costByModel).map(([model, cost]) => (
                          <div key={model} className="flex justify-between text-sm">
                            <span className="text-[var(--color-text-secondary)]">{model.split('-').slice(-2).join('-')}</span>
                            <span className="font-medium">${cost.toFixed(4)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[var(--color-text-muted)] text-sm">No cost data available</p>
                    )}
                  </div>
                </div>

                {/* Recent Documents */}
                <div className="chart-container">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-[var(--color-text-primary)]">Recent Documents</h3>
                    <button 
                      onClick={() => setActiveTab('documents')}
                      className="text-sm font-medium text-[var(--stat-blue-text)] hover:underline"
                    >
                      View All
                    </button>
                  </div>
                  <div className="space-y-2">
                    {documents.slice(0, 5).map(doc => (
                      <div key={doc.id} className="flex items-center gap-3 py-2 border-b border-[var(--color-border-light)] last:border-0">
                        <div 
                          className={`w-2 h-2 rounded-full ${
                            doc.status === 'COMPLETED' ? 'bg-emerald-500' :
                            doc.status === 'FAILED' ? 'bg-red-500' : 'bg-amber-500'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{doc.originalName}</p>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {doc.status} • {new Date(doc.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    {documents.length === 0 && (
                      <p className="text-[var(--color-text-muted)] py-4 text-center text-sm">
                        No documents yet. Upload some PDFs to get started.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'upload' && (
              <div className="max-w-2xl mx-auto">
                <h1 className="text-xl font-semibold text-[var(--color-text-primary)] mb-6">Upload Documents</h1>
                <UploadManager onUploadComplete={handleUploadComplete} />
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Documents</h1>
                  <ExportControls data={documents} />
                </div>
                <DataTable 
                  data={documents}
                  onViewDocument={(doc) => setSelectedDocument(doc)}
                />
              </div>
            )}

            {activeTab === 'metrics' && (
              <div>
                <h1 className="text-xl font-semibold text-[var(--color-text-primary)] mb-6">Metrics & Analytics</h1>
                <MetricsPanel
                  totalDocuments={totalDocuments}
                  completedDocuments={completedDocuments}
                  failedDocuments={failedDocuments}
                  pendingDocuments={pendingDocuments}
                  costSummary={stats.costSummary}
                />
              </div>
            )}

            {/* Placeholder pages */}
            {['profile', 'account', 'corporate', 'blog', 'social'].includes(activeTab) && (
              <div className="flex items-center justify-center h-64">
                <p className="text-[var(--color-text-muted)]">
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} page coming soon...
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Right Panel - Notifications */}
      {showNotifications && (
        <div className="fixed right-0 top-0 h-screen">
          <NotificationsPanel />
        </div>
      )}
    </div>
  );
}
