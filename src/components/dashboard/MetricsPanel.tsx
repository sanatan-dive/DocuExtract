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
    <div className="flex flex-col gap-6">
      {/* Document Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="text-sm font-medium text-gray-500 mb-4">Model Usage</div>
            <div className="flex flex-col gap-3">
              {Object.entries(costSummary.costByModel).map(([model, cost]) => (
                <div key={model} className="flex justify-between text-sm">
                  <span className="text-gray-500">{model.split('-').slice(-2).join('-')}</span>
                  <span className="font-medium text-gray-900">${cost.toFixed(4)}</span>
                </div>
              ))}
              {Object.keys(costSummary.costByModel).length === 0 && (
                <span className="text-gray-400 text-sm">No data yet</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Progress Overview */}
      {totalDocuments > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex justify-between mb-4">
            <span className="text-lg font-semibold text-gray-900">Processing Progress</span>
            <span className="text-sm text-gray-500">{successRate}% complete</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
            <div 
              className="bg-emerald-500 transition-all duration-500" 
              style={{ width: `${(completedDocuments / totalDocuments) * 100}%` }} 
            />
            <div 
              className="bg-red-500 transition-all duration-500" 
              style={{ width: `${(failedDocuments / totalDocuments) * 100}%` }} 
            />
            <div 
              className="bg-amber-500 transition-all duration-500" 
              style={{ width: `${(pendingDocuments / totalDocuments) * 100}%` }} 
            />
          </div>
          <div className="flex gap-6 mt-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-gray-500">Completed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-gray-500">Failed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-gray-500">Pending</span>
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
  const colorClasses = {
    blue: { bg: 'bg-blue-100', icon: 'text-blue-600' },
    green: { bg: 'bg-emerald-100', icon: 'text-emerald-600' },
    red: { bg: 'bg-red-100', icon: 'text-red-600' },
    orange: { bg: 'bg-amber-100', icon: 'text-amber-600' },
    purple: { bg: 'bg-purple-100', icon: 'text-purple-600' },
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2.5 rounded-lg ${colorClasses[color].bg}`}>
          <Icon className={`w-5 h-5 ${colorClasses[color].icon}`} />
        </div>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        {subValue && (
          <span className="text-sm text-gray-500">{subValue}</span>
        )}
      </div>
    </div>
  );
}

export default MetricsPanel;
