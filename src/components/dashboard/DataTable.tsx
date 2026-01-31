'use client';

import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  Search,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { DocumentWithRelations } from '@/types';

interface DataTableProps {
  data: DocumentWithRelations[];
  onViewDocument?: (document: DocumentWithRelations) => void;
}

export function DataTable({ data, onViewDocument }: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo<ColumnDef<DocumentWithRelations>[]>(
    () => [
      {
        accessorKey: 'originalName',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-gray-900"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            File Name
            <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-medium" style={{ maxWidth: '200px' }}>
              {row.original.originalName}
            </span>
            {row.original.extractedData?.needsReview && (
              <AlertCircle className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
            )}
          </div>
        ),
      },
      {
        accessorKey: 'extractedData.name',
        header: 'Name',
        cell: ({ row }) => row.original.extractedData?.name || '-',
      },
      {
        accessorKey: 'extractedData.city',
        header: 'City',
        cell: ({ row }) => row.original.extractedData?.city || '-',
      },
      {
        accessorKey: 'extractedData.date',
        header: 'Date',
        cell: ({ row }) => row.original.extractedData?.date || '-',
      },
      {
        accessorKey: 'classification',
        header: 'Type',
        cell: ({ row }) => {
          const type = row.original.classification;
          const badges: Record<string, string> = {
            HANDWRITTEN: 'badge-purple',
            TYPED: 'badge-info',
            MIXED: 'badge-warning',
            SCANNED: 'badge-secondary',
          };
          return (
            <span className={`badge ${badges[type || ''] || 'badge-info'}`}>
              {type || 'Unknown'}
            </span>
          );
        },
      },
      {
        accessorKey: 'extractedData.overallConfidence',
        header: 'Confidence',
        cell: ({ row }) => {
          const confidence = row.original.extractedData?.overallConfidence;
          if (confidence === undefined || confidence === null) return '-';
          
          const percent = Math.round(confidence * 100);
          return (
            <div className="flex items-center gap-2">
              <div className="progress-bar" style={{ width: '60px' }}>
                <div
                  className={`progress-fill ${percent >= 80 ? 'success' : percent < 50 ? 'error' : ''}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {percent}%
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.original.status;
          const badges: Record<string, string> = {
            COMPLETED: 'badge-success',
            FAILED: 'badge-error',
            PENDING: 'badge-warning',
            PREPROCESSING: 'badge-info',
            CLASSIFYING: 'badge-info',
            EXTRACTING: 'badge-info',
          };
          return (
            <span className={`badge ${badges[status] || 'badge-info'}`}>
              {status}
            </span>
          );
        },
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <button
            onClick={() => onViewDocument?.(row.original)}
            className="btn btn-ghost"
            style={{ padding: '6px' }}
          >
            <Eye className="w-4 h-4" />
          </button>
        ),
      },
    ],
    [onViewDocument]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: { sorting, columnFilters, globalFilter },
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <div>
      {/* Search */}
      <div className="search-box" style={{ maxWidth: '320px', marginBottom: '20px' }}>
        <Search />
        <input
          type="text"
          placeholder="Search documents..."
          value={globalFilter}
          onChange={e => setGlobalFilter(e.target.value)}
          className="input-field"
        />
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map(row => (
                <tr key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No documents found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Rows per page:</span>
          <select
            value={table.getState().pagination.pageSize}
            onChange={e => table.setPageSize(Number(e.target.value))}
            className="input-field"
            style={{ width: 'auto', padding: '6px 10px' }}
          >
            {[10, 25, 50, 100].map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} className="btn btn-ghost" style={{ padding: '6px' }}>
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="btn btn-ghost" style={{ padding: '6px' }}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="btn btn-ghost" style={{ padding: '6px' }}>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()} className="btn btn-ghost" style={{ padding: '6px' }}>
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataTable;
