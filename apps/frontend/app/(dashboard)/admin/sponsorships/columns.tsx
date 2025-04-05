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
import { MoreHorizontal, Edit, Trash, Calendar, User, Users } from 'lucide-react';
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

// Define the Sponsorship type
export type Sponsorship = {
  id: number;
  sponsor_id: number;
  child_id: number;
  status: string;
  start_date: string;
  end_date?: string;
  monthly_amount: number;
  currency: string;
  // Derived fields
  sponsor_name: string;
  child_name: string;
  payment_count?: number;
  total_amount?: number;
};

interface DeleteSponsorshipAlertProps {
  sponsorship: Sponsorship;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

function DeleteSponsorshipAlert({
  sponsorship,
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteSponsorshipAlertProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-600">Delete Sponsorship</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the sponsorship between {sponsorship.sponsor_name} and{' '}
            {sponsorship.child_name}? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer" disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/80 cursor-pointer"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function SponsorshipsColumns(
  onEdit: (sponsorship: Sponsorship) => void,
  onDelete: (sponsorship: Sponsorship) => void,
): ColumnDef<Sponsorship>[] {
  return [
    {
      accessorKey: 'sponsor_name',
      header: 'Sponsor',
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{row.getValue('sponsor_name')}</span>
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
            <span className="font-medium">{row.getValue('child_name')}</span>
          </div>
        );
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
          case 'active':
            badgeClasses = 'bg-green-50 text-green-600 border-green-200';
            break;
          case 'inactive':
            badgeClasses = 'bg-gray-50 text-gray-600 border-gray-200';
            break;
          case 'pending':
            badgeClasses = 'bg-yellow-50 text-yellow-600 border-yellow-200';
            break;
          case 'terminated':
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
      accessorKey: 'start_date',
      header: 'Start Date',
      cell: ({ row }) => {
        const dateStr = row.getValue('start_date') as string;
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
      accessorKey: 'payment_count',
      header: 'Payments',
      cell: ({ row }) => {
        const count = row.original.payment_count;
        return <div className="text-center font-medium">{count || 0}</div>;
      },
    },
    {
      accessorKey: 'total_amount',
      header: 'Total Amount',
      cell: ({ row }) => {
        const amount = row.original.total_amount;
        const currency = row.original.currency || 'KSh';
        return (
          <div className="font-medium">{`${currency} ${amount ? amount.toLocaleString() : '0'}`}</div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const sponsorship = row.original;
        return <SponsorshipActions sponsorship={sponsorship} onEdit={onEdit} onDelete={onDelete} />;
      },
    },
  ];
}

interface SponsorshipActionsProps {
  sponsorship: Sponsorship;
  onEdit: (sponsorship: Sponsorship) => void;
  onDelete: (sponsorship: Sponsorship) => void;
}

const SponsorshipActions: React.FC<SponsorshipActionsProps> = ({
  sponsorship,
  onEdit,
  onDelete,
}) => {
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
      // Use the correct endpoint for deleting sponsorships
      await axios.delete(`${baseUrl}/sponsorships/${sponsorship.id}`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      toast.success('Sponsorship deleted', {
        description: `The sponsorship between ${sponsorship.sponsor_name} and ${sponsorship.child_name} has been deleted.`,
      });

      // Call the onDelete callback to refresh the list
      onDelete(sponsorship);
    } catch (error: any) {
      console.error('Error deleting sponsorship:', error);

      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.detail || error.message;
        toast.error('Failed to delete sponsorship', {
          description: errorMessage,
        });
      } else {
        toast.error('Failed to delete sponsorship', {
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
        <DropdownMenuTrigger className="cursor-pointer" asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="text-brand-blue">Actions</DropdownMenuLabel>
          <DropdownMenuItem className="cursor-pointer" onClick={() => onEdit(sponsorship)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Sponsorship
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setIsDeleteDialogOpen(true)}
            className="text-destructive cursor-pointer"
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete Sponsorship
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteSponsorshipAlert
        sponsorship={sponsorship}
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </>
  );
};
