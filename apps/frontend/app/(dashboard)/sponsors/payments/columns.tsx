'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { ArrowUpDown, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

// Define the Payment interface
export interface Payment {
  id: number;
  sponsor_id: number;
  child_id: number;
  child_name?: string; // Added field for child name
  amount: number;
  currency: string;
  transaction_id: string;
  payment_method: string;
  status: string;
  payment_date: string;
}

export const columns: ColumnDef<Payment>[] = [
  {
    accessorKey: 'transaction_id',
    header: () => <div className="text-brand-purple">Transaction ID</div>,
    cell: ({ row }) => <div>{row.getValue('transaction_id')}</div>,
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="cursor-pointer text-brand-purple"
        >
          Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const amount = Number.parseFloat(row.getValue('amount'));
      const currency = row.original.currency;
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency === 'KSh' ? 'KES' : 'USD',
        currencyDisplay: 'narrowSymbol',
      }).format(amount);

      return <div className="font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: 'payment_date',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="cursor-pointer text-brand-purple"
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      try {
        const date = parseISO(row.getValue('payment_date'));
        return <div>{format(date, 'PPP')}</div>;
      } catch (error) {
        // Fallback for invalid dates
        return <div>{row.getValue('payment_date')}</div>;
      }
    },
  },
  {
    accessorKey: 'payment_method',
    header: () => <div className="text-brand-purple">Method</div>,
    cell: ({ row }) => <div>{row.getValue('payment_method')}</div>,
  },
  {
    accessorKey: 'child_name',
    header: () => <div className="text-brand-purple">Child</div>,
    cell: ({ row }) => {
      const childNameValue = row.getValue('child_name');
      const childName = childNameValue ? String(childNameValue) : `Child #${row.original.child_id}`;
      return <div>{childName}</div>;
    },
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
            status === 'completed'
              ? 'bg-green-50 text-green-600 border-green-200'
              : status === 'pending'
                ? 'bg-yellow-50 text-yellow-600 border-yellow-200'
                : 'bg-red-50 text-red-600 border-red-200'
          }
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const payment = row.original;
      const router = useRouter();

      return (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/sponsors/children/${payment.child_id}`)}
            className="cursor-pointer"
          >
            <Eye className="h-4 w-4 mr-2" />
            View Child
          </Button>
        </div>
      );
    },
  },
];
