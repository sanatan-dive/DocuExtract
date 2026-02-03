"use client";

import React, { useMemo, useState } from "react";
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
} from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  Search,
  Eye,
  AlertCircle,
} from "lucide-react";
import { DocumentWithRelations } from "@/types";

interface DataTableProps {
  data: DocumentWithRelations[];
  isLoading?: boolean;
  onViewDocument?: (document: DocumentWithRelations) => void;
}

export function DataTable({ data, isLoading, onViewDocument }: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const getBadgeClass = (type: string, variant: "type" | "status") => {
    if (variant === "type") {
      const badges: Record<string, string> = {
        HANDWRITTEN: "bg-purple-100 text-purple-700",
        TYPED: "bg-blue-100 text-blue-700",
        MIXED: "bg-amber-100 text-amber-700",
        SCANNED: "bg-gray-100 text-gray-700",
      };
      return badges[type] || "bg-blue-100 text-blue-700";
    } else {
      const badges: Record<string, string> = {
        COMPLETED: "bg-emerald-100 text-emerald-700",
        FAILED: "bg-red-100 text-red-700",
        PENDING: "bg-amber-100 text-amber-700",
        PREPROCESSING: "bg-blue-100 text-blue-700",
        CLASSIFYING: "bg-blue-100 text-blue-700",
        EXTRACTING: "bg-blue-100 text-blue-700",
      };
      return badges[type] || "bg-blue-100 text-blue-700";
    }
  };

  const columns = useMemo<ColumnDef<DocumentWithRelations>[]>(
    () => [
      {
        accessorKey: "originalName",
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            File Name
            <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 max-w-[200px] truncate">
              {row.original.originalName}
            </span>
            {row.original.extractedData?.needsReview && (
              <AlertCircle className="w-4 h-4 text-amber-500" />
            )}
          </div>
        ),
      },
      {
        accessorKey: "extractedData.name",
        header: () => <span className="text-gray-600">Name</span>,
        cell: ({ row }) => (
          <span className="text-gray-700">
            {row.original.extractedData?.name || "-"}
          </span>
        ),
      },
      {
        accessorKey: "extractedData.city",
        header: () => <span className="text-gray-600">City</span>,
        cell: ({ row }) => (
          <span className="text-gray-700">
            {row.original.extractedData?.city || "-"}
          </span>
        ),
      },
      {
        accessorKey: "extractedData.date",
        header: () => <span className="text-gray-600">Date</span>,
        cell: ({ row }) => (
          <span className="text-gray-700">
            {row.original.extractedData?.date || "-"}
          </span>
        ),
      },
      {
        accessorKey: "classification",
        header: () => <span className="text-gray-600">Type</span>,
        cell: ({ row }) => {
          const type = row.original.classification;
          return (
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${getBadgeClass(type || "", "type")}`}
            >
              {type || "Unknown"}
            </span>
          );
        },
      },
      {
        accessorKey: "extractedData.overallConfidence",
        header: () => <span className="text-gray-600">Confidence</span>,
        cell: ({ row }) => {
          const confidence = row.original.extractedData?.overallConfidence;
          if (confidence === undefined || confidence === null)
            return <span className="text-gray-400">-</span>;

          const percent = Math.round(confidence * 100);
          const barColor =
            percent >= 80
              ? "bg-emerald-500"
              : percent < 50
                ? "bg-red-500"
                : "bg-amber-500";

          return (
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${barColor}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{percent}%</span>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: () => <span className="text-gray-600">Status</span>,
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${getBadgeClass(status, "status")}`}
            >
              {status}
            </span>
          );
        },
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <button
            onClick={() => onViewDocument?.(row.original)}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
        ),
      },
    ],
    [onViewDocument],
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
      <div className="relative max-w-xs mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search documents..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <tr key={rowIndex} className="animate-pulse">
                  {columns.map((_, colIndex) => (
                    <td key={colIndex} className="px-4 py-4">
                      <div className="h-4 bg-gray-200 rounded w-full max-w-[120px]"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-sm">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center py-10 text-gray-400"
                >
                  No documents found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Rows per page:</span>
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </span>

          <div className="flex gap-1">
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataTable;
