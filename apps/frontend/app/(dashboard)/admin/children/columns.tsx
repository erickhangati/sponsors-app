'use client';

import type React from 'react';

import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { MoreHorizontal, Edit, Trash, User } from 'lucide-react';
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

// Define the Child type
export type Child = {
  id: number;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  status?: string;
  location?: string;
  school?: string;
  grade?: string;
  guardian_name?: string;
  guardian_contact?: string;
  background_info?: string;
  profile_image?: string;
  // Derived fields
  sponsorship_status?: string;
  age?: number;
  // New fields
  sponsor_name?: string;
  sponsor_id?: number;
  payment_count?: number;
  total_amount?: number;
  currency?: string;
};

interface DeleteChildAlertProps {
  child: Child;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

function DeleteChildAlert({
  child,
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteChildAlertProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-600">Delete Child</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete {child.first_name} {child.last_name}? This action cannot
            be undone.
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

// Update the ChildrenColumns function to include the new columns and remove the old ones

export function ChildrenColumns(
  onEdit: (child: Child) => void,
  onDelete: (child: Child) => void,
): ColumnDef<Child>[] {
  return [
    {
      id: 'name',
      header: 'Child',
      cell: ({ row }) => {
        const child = row.original;
        return (
          <div className="flex items-center gap-3 min-w-[200px]">
            <Avatar className="h-9 w-9">
              <AvatarImage
                src={child.profile_image}
                alt={`${child.first_name} ${child.last_name}`}
              />
              <AvatarFallback>{`${child.first_name.charAt(0)}${child.last_name.charAt(0)}`}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{`${child.first_name} ${child.last_name}`}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <User className="mr-1 h-3 w-3" />
                {child.gender || 'Not specified'} • {calculateAge(child.date_of_birth)} years
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'sponsorship_status',
      header: 'Sponsorship',
      cell: ({ row }) => {
        const status = row.getValue('sponsorship_status') as string;

        // Updated badge styling to match the Reports table
        let badgeClasses = '';

        switch (status) {
          case 'active':
            badgeClasses = 'bg-green-50 text-green-600 border-green-200';
            break;
          case 'pending':
            badgeClasses = 'bg-yellow-50 text-yellow-600 border-yellow-200';
            break;
          default:
            badgeClasses = 'bg-gray-50 text-gray-600 border-gray-200';
        }

        return (
          <Badge variant="outline" className={badgeClasses}>
            {status === 'active' ? 'Active' : status === 'pending' ? 'Pending' : 'Not Sponsored'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'sponsor_name',
      header: 'Sponsor',
      cell: ({ row }) => {
        const sponsorName = row.getValue('sponsor_name') as string | undefined;
        return (
          <div className="flex items-center whitespace-nowrap">
            {sponsorName ? (
              <div className="font-medium">{sponsorName}</div>
            ) : (
              <div className="text-muted-foreground">No Sponsor</div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'payment_count',
      header: 'Payments',
      cell: ({ row }) => {
        const paymentCount = row.getValue('payment_count') as number | undefined;
        return <div className="text-center font-medium">{paymentCount || 0}</div>;
      },
    },
    {
      accessorKey: 'total_amount',
      header: 'Amount',
      cell: ({ row }) => {
        const totalAmount = row.getValue('total_amount') as number | undefined;
        const currency = row.original.currency || 'KSh';
        return (
          <div className="font-medium">{`${currency} ${(totalAmount || 0).toLocaleString()}`}</div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const child = row.original;
        return <ChildActions child={child} onEdit={onEdit} onDelete={onDelete} />;
      },
    },
  ];
}

// Helper function to calculate age from date of birth
function calculateAge(dateOfBirth?: string): number {
  if (!dateOfBirth) return 0;

  const birthDate = new Date(dateOfBirth);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

interface ChildActionsProps {
  child: Child;
  onEdit: (child: Child) => void;
  onDelete: (child: Child) => void;
}

const ChildActions: React.FC<ChildActionsProps> = ({ child, onEdit, onDelete }) => {
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
      await axios.delete(`${baseUrl}/users/${child.id}`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      toast.success('Child deleted', {
        description: `${child.first_name} ${child.last_name} has been deleted.`,
      });

      // Call the onDelete callback to refresh the list
      onDelete(child);
    } catch (error: any) {
      console.error('Error deleting child:', error);

      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.detail || error.message;
        toast.error('Failed to delete child', {
          description: errorMessage,
        });
      } else {
        toast.error('Failed to delete child', {
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
        <DropdownMenuTrigger asChild className="cursor-pointer">
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="text-brand-blue">Actions</DropdownMenuLabel>
          <DropdownMenuItem className="cursor-pointer" onClick={() => onEdit(child)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Child
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setIsDeleteDialogOpen(true)}
            className="text-destructive cursor-pointer"
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete Child
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteChildAlert
        child={child}
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </>
  );
};
