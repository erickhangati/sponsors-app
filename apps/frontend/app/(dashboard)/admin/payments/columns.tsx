'use client';

import type React from 'react';

import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Edit,
  Trash,
  Calendar,
  User,
  Users,
  CreditCard,
  Receipt,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Define the Payment type
export type Payment = {
  id: number;
  sponsor_id: number;
  child_id: number;
  amount: number;
  currency: string;
  transaction_id: string;
  payment_method: string;
  status: string;
  payment_date: string;
  // Derived fields
  sponsor_name?: string;
  child_name?: string;
};

interface DeletePaymentAlertProps {
  payment: Payment;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

function DeletePaymentAlert({
  payment,
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}: DeletePaymentAlertProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[#ea1a23]">Delete Payment</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the payment of {payment.currency} {payment.amount} from{' '}
            {payment.sponsor_name} for {payment.child_name}? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting} className="cursor-pointer">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function PaymentsColumns(
  onEdit: (payment: Payment) => void,
  onDelete: (payment: Payment) => void,
): ColumnDef<Payment>[] {
  return [
    {
      accessorKey: 'transaction_id',
      header: 'Transaction',
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{row.getValue('transaction_id')}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'sponsor_name',
      header: 'Sponsor',
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{row.getValue('sponsor_name')}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'child_name',
      header: 'Child',
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{row.getValue('child_name')}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => {
        const amount = Number.parseFloat(row.getValue('amount'));
        const currency = row.original.currency || 'KSh';

        // Format the amount with the currency
        // Ensure currency is always displayed as "KSh" regardless of what's stored in the database
        const formatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'KES', // Use KES for formatting
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(amount);

        // Replace the currency code with KSh in the formatted string
        const displayValue = formatted.replace('KES', 'KSh').replace('KSH', 'KSh');

        return (
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{displayValue}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'payment_method',
      header: 'Method',
      cell: ({ row }) => {
        return <div>{row.getValue('payment_method')}</div>;
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;

        // Updated badge styling to match the Reports table
        let badgeClasses = '';

        switch (status) {
          case 'completed':
            badgeClasses = 'bg-green-50 text-green-600 border-green-200';
            break;
          case 'pending':
            badgeClasses = 'bg-yellow-50 text-yellow-600 border-yellow-200';
            break;
          case 'failed':
            badgeClasses = 'bg-red-50 text-red-600 border-red-200';
            break;
          default:
            badgeClasses = 'bg-gray-50 text-gray-600 border-gray-200';
        }

        return (
          <Badge variant="outline" className={badgeClasses}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'payment_date',
      header: 'Date',
      cell: ({ row }) => {
        const dateStr = row.getValue('payment_date') as string;
        if (!dateStr) return <div>-</div>;
        const date = new Date(dateStr);
        return (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{format(date, 'MMM d, yyyy')}</span>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const payment = row.original;
        return <PaymentActions payment={payment} onEdit={onEdit} onDelete={onDelete} />;
      },
    },
  ];
}

interface PaymentActionsProps {
  payment: Payment;
  onEdit: (payment: Payment) => void;
  onDelete: (payment: Payment) => void;
}

const PaymentActions: React.FC<PaymentActionsProps> = ({ payment, onEdit, onDelete }) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { data: session } = useSession();

  const handleDelete = async () => {
    if (!session?.accessToken) {
      toast.error('Authentication error', {
        description: 'You must be logged in to perform this action.',
      });
      return;
    }

    setIsDeleting(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL || 'http://127.0.0.1:8000';
      await axios.delete(`${baseUrl}/payments/${payment.id}`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      toast.success('Payment deleted', {
        description: `The payment of ${payment.currency} ${payment.amount} has been deleted.`,
      });

      // Call the onDelete callback to refresh the list
      onDelete(payment);
    } catch (error: any) {
      console.error('Error deleting payment:', error);

      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.detail || error.message;
        toast.error('Failed to delete payment', {
          description: errorMessage,
        });
      } else {
        toast.error('Failed to delete payment', {
          description: 'An unexpected error occurred. Please try again.',
        });
      }
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0 cursor-pointer">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="text-brand-blue">Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onEdit(payment)} className="cursor-pointer">
            <Edit className="mr-2 h-4 w-4" />
            Edit Payment
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setIsDeleteDialogOpen(true)}
            className="text-destructive cursor-pointer"
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete Payment
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeletePaymentAlert
        payment={payment}
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </>
  );
};
