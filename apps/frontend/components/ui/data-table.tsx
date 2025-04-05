'use client';

import { useState, useEffect } from 'react';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type SortingState,
  getSortedRowModel,
  type ColumnFiltersState,
  getFilteredRowModel,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Update the interface to include pagination
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data?: TData[];
  isLoading?: boolean;
  refreshTrigger?: number;
  pageSize?: number;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}

export function DataTable<TData, TValue>({
  columns,
  data = [],
  isLoading = false,
  refreshTrigger = 0,
  pageSize = 10,
  pagination,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // Mock data for the skeleton loader
  const mockData = Array(10)
    .fill(null)
    .map((_, i) => ({ id: i })) as TData[];

  // Effect to handle refreshing data
  useEffect(() => {
    // This effect can be used to fetch data when refreshTrigger changes
    console.log('Data refresh triggered:', refreshTrigger);
  }, [refreshTrigger]);

  // Update the table initialization to use the pageSize prop
  const table = useReactTable({
    data: isLoading ? mockData : data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
      pagination: {
        pageIndex: 0,
        pageSize,
      },
    },
  });

  // Store pagination state
  const canPreviousPage = pagination ? pagination.currentPage > 1 : table.getCanPreviousPage();
  const canNextPage = pagination
    ? pagination.currentPage < pagination.totalPages
    : table.getCanNextPage();

  return (
    <div className="w-full overflow-auto">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header, index) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      index === 0 ? 'pl-5' : '',
                      index === headerGroup.headers.length - 1 ? 'pr-5' : '',
                      'text-brand-purple',
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Skeleton loader for loading state
              Array(10)
                .fill(0)
                .map((_, rowIndex) => (
                  <TableRow key={`skeleton-${rowIndex}`}>
                    {columns.map((_, colIndex) => (
                      <TableCell
                        key={`skeleton-cell-${rowIndex}-${colIndex}`}
                        className={cn(
                          colIndex === 0 ? 'pl-5' : '',
                          colIndex === columns.length - 1 ? 'pr-5' : '',
                        )}
                      >
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell, cellIndex) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        cellIndex === 0 ? 'pl-5' : '',
                        cellIndex === row.getVisibleCells().length - 1 ? 'pr-5' : '',
                        'text-gray-700 py-2.5', // Reduced from py-4 to py-2.5 for moderate padding
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {isLoading ? (
            <Skeleton className="h-5 w-40" />
          ) : pagination ? (
            `Page ${pagination.currentPage} of ${pagination.totalPages}`
          ) : (
            `Showing ${table.getFilteredRowModel().rows.length} of ${data.length} reports`
          )}
        </div>
        <div className="space-x-2">
          {/* Only show Previous button if there are previous pages */}
          {canPreviousPage && !isLoading && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                pagination
                  ? pagination.onPageChange(pagination.currentPage - 1)
                  : table.previousPage()
              }
              className="cursor-pointer"
            >
              Previous
            </Button>
          )}

          {/* Only show Next button if there are next pages */}
          {canNextPage && !isLoading && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                pagination ? pagination.onPageChange(pagination.currentPage + 1) : table.nextPage()
              }
              className="cursor-pointer"
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
