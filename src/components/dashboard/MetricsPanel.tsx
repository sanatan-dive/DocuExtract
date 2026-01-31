'use client';

import React from 'react';
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign,
  Zap,
  TrendingDown,
} from 'lucide-react';
import { CostSummary } from '@/types';

interface MetricsPanelProps {
  totalDocuments: number;
  completedDocuments: number;
  failedDocuments: number;
  pendingDocuments: number;
  costSummary?: CostSummary;
}

export function MetricsPanel({
  totalDocuments,
  completedDocuments,
  failedDocuments,
  pendingDocuments,
  costSummary,
}: MetricsPanelProps) {
  const successRate = totalDocuments > 0 
    ? Math.round((completedDocuments / totalDocuments) * 100) 
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Document Stats */}
      <div className="stats-grid">
        <StatCard
          icon={FileText}
          label="Total Documents"
          value={totalDocuments}
          color="blue"
        />
        <StatCard
          icon={CheckCircle}
          label="Completed"
          value={completedDocuments}
          subValue={`${successRate}%`}
          color="green"
        />
        <StatCard
          icon={XCircle}
          label="Failed"
          value={failedDocuments}
          color="red"
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={pendingDocuments}
          color="orange"
        />
      </div>

      {/* Cost Stats */}
      {costSummary && (
        <div className="stats-grid">
          <StatCard
            icon={DollarSign}
            label="Total Cost"
            value={`$${costSummary.totalCost.toFixed(4)}`}
            color="green"
          />
          <StatCard
            icon={Zap}
            label="Avg. per Document"
            value={`$${costSummary.averageCostPerDocument.toFixed(6)}`}
            color="purple"
          />
          <StatCard
            icon={TrendingDown}
            label="Batch Savings"
            value={`$${costSummary.batchSavings.toFixed(4)}`}
            color="blue"
          />
          <div className="card">
            <div className="card-title" style={{ marginBottom: '16px' }}>Model Usage</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(costSummary.costByModel).map(([model, cost]) => (
                <div key={model} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {model.split('-').slice(-2).join('-')}
                  </span>
                  <span style={{ fontWeight: 500 }}>${cost.toFixed(4)}</span>
                </div>
              ))}
              {Object.keys(costSummary.costByModel).length === 0 && (
                <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No data yet</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Progress Overview */}
      {totalDocuments > 0 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span className="card-title">Processing Progress</span>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{successRate}% complete</span>
          </div>
          <div style={{ height: '12px', background: 'var(--bg-tertiary)', borderRadius: '6px', overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${(completedDocuments / totalDocuments) * 100}%`, background: 'var(--accent-green)', transition: 'width 0.5s' }} />
            <div style={{ width: `${(failedDocuments / totalDocuments) * 100}%`, background: 'var(--accent-red)', transition: 'width 0.5s' }} />
            <div style={{ width: `${(pendingDocuments / totalDocuments) * 100}%`, background: 'var(--accent-orange)', transition: 'width 0.5s' }} />
          </div>
          <div style={{ display: 'flex', gap: '24px', marginTop: '16px', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Completed</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-red)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Failed</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-orange)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Pending</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  icon: React.ComponentType<any>;
  label: string;
  value: string | number;
  subValue?: string;
  color: 'blue' | 'green' | 'red' | 'orange' | 'purple';
}

function StatCard({ icon: Icon, label, value, subValue, color }: StatCardProps) {
  const colors = {
    blue: { bg: 'var(--accent-blue-light)', icon: 'var(--accent-blue)' },
    green: { bg: 'var(--accent-green-light)', icon: 'var(--accent-green)' },
    red: { bg: 'var(--accent-red-light)', icon: 'var(--accent-red)' },
    orange: { bg: 'var(--accent-orange-light)', icon: 'var(--accent-orange)' },
    purple: { bg: 'var(--accent-purple-light)', icon: 'var(--accent-purple)' },
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{ 
          padding: '10px', 
          borderRadius: '10px', 
          background: colors[color].bg 
        }}>
          <Icon className="w-5 h-5" style={{ color: colors[color].icon }} />
        </div>
        <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{ fontSize: '28px', fontWeight: 700 }}>{value}</span>
        {subValue && (
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{subValue}</span>
        )}
      </div>
    </div>
  );
}

export default MetricsPanel;
