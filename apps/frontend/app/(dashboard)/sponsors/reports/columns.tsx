'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { ArrowUpDown, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

// Define the Report type
export interface Report {
  id: number;
  child_id: number;
  report_date: string;
  report_type: string;
  details: string;
  status: string;
  child_name?: string;
}

export const columns: ColumnDef<Report>[] = [
  // Reordered columns as requested
  {
    accessorKey: 'child_name',
    header: () => <div className="text-brand-purple">Child</div>,
    cell: ({ row }) => {
      const childName = String(row.getValue('child_name') || `Child #${row.original.child_id}`);
      return <div>{childName}</div>;
    },
  },
  {
    accessorKey: 'report_type',
    header: () => <div className="text-brand-purple">Report Type</div>,
    cell: ({ row }) => {
      const reportType = String(row.getValue('report_type'));
      return <div className="font-medium">{reportType}</div>;
    },
  },
  {
    accessorKey: 'report_date',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="cursor-pointer text-brand-purple"
      >
        Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      // Format the date
      const dateString = row.getValue('report_date') as string;
      let formattedDate = dateString;

      try {
        formattedDate = format(parseISO(dateString), 'PPP');
      } catch (error) {
        // If date parsing fails, use the original string
        console.error('Error parsing date:', error);
      }

      return <div>{formattedDate}</div>;
    },
    sortingFn: 'datetime',
  },
  {
    accessorKey: 'status',
    header: () => <div className="text-brand-purple">Status</div>,
    cell: ({ row }) => {
      const status = row.getValue('status') as string;

      return (
        <Badge
          variant="outline"
          className={
            status === 'read'
              ? 'bg-green-50 text-green-600 border-green-200'
              : 'bg-yellow-50 text-yellow-600 border-yellow-200'
          }
        >
          {status === 'read' ? 'Read' : 'Unread'}
        </Badge>
      );
    },
  },
  {
    id: 'actions',
    header: () => <div className="text-brand-purple text-right">Actions</div>,
    cell: ({ row }) => {
      const report = row.original;

      return (
        <div className="text-right">
          <Button variant="outline" size="sm" className="cursor-pointer" asChild>
            <Link href={`/sponsors/reports/${report.id}`}>
              <Eye className="h-4 w-4 mr-2" />
              View Report
            </Link>
          </Button>
        </div>
      );
    },
  },
];
