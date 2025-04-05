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
import { MoreHorizontal, Edit, Trash, Mail, Phone } from 'lucide-react';
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

// Define the Sponsor type
export type Sponsor = {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  phone_number: string;
  is_active: boolean;
  date_of_birth?: string;
  gender?: string;
  background_info?: string;
  role: string;
  avatar?: string;
  // Derived fields
  status?: 'active' | 'inactive' | 'pending';
  totalSponsored?: number;
};

interface DeleteSponsorAlertProps {
  sponsor: Sponsor;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

function DeleteSponsorAlert({
  sponsor,
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteSponsorAlertProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-600">Delete Sponsor</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete {sponsor.first_name} {sponsor.last_name}? This action
            cannot be undone.
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

export function SponsorsColumns(
  onEdit: (sponsor: Sponsor) => void,
  onDelete: (sponsor: Sponsor) => void,
): ColumnDef<Sponsor>[] {
  return [
    {
      id: 'name',
      header: 'Sponsor',
      cell: ({ row }) => {
        const sponsor = row.original;
        return (
          <div className="flex items-center gap-3 min-w-[200px]">
            <Avatar className="h-9 w-9">
              <AvatarImage
                src={sponsor.avatar}
                alt={`${sponsor.first_name} ${sponsor.last_name}`}
              />
              <AvatarFallback>{`${sponsor.first_name.charAt(0)}${sponsor.last_name.charAt(0)}`}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{`${sponsor.first_name} ${sponsor.last_name}`}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <Mail className="mr-1 h-3 w-3" />
                {sponsor.email}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'phone_number',
      header: 'Phone',
      cell: ({ row }) => (
        <div className="flex items-center whitespace-nowrap">
          <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
          {row.getValue('phone_number')}
        </div>
      ),
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
          default:
            badgeClasses = 'bg-gray-50 text-gray-600 border-gray-200';
        }

        return (
          <Badge variant="outline" className={badgeClasses}>
            {status === 'active' ? 'Active' : status === 'inactive' ? 'Inactive' : 'Pending'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'date_of_birth',
      header: 'Date of Birth',
      cell: ({ row }) => {
        const dateStr = row.getValue('date_of_birth') as string | undefined;
        if (!dateStr) return <div>-</div>;
        const date = new Date(dateStr);
        return <div className="whitespace-nowrap">{format(date, 'MMM d, yyyy')}</div>;
      },
    },
    {
      accessorKey: 'totalSponsored',
      header: 'Children Sponsored',
      cell: ({ row }) => {
        const count = row.getValue('totalSponsored') as number | undefined;
        return <div className="text-center font-medium">{count || 0}</div>;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const sponsor = row.original;
        return <SponsorActions sponsor={sponsor} onEdit={onEdit} onDelete={onDelete} />;
      },
    },
  ];
}

interface SponsorActionsProps {
  sponsor: Sponsor;
  onEdit: (sponsor: Sponsor) => void;
  onDelete: (sponsor: Sponsor) => void;
}

const SponsorActions: React.FC<SponsorActionsProps> = ({ sponsor, onEdit, onDelete }) => {
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
      await axios.delete(`${baseUrl}/users/${sponsor.id}`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      toast.success('Sponsor deleted', {
        description: `${sponsor.first_name} ${sponsor.last_name} has been deleted.`,
      });

      // Call the onDelete callback to refresh the list
      onDelete(sponsor);
    } catch (error: any) {
      console.error('Error deleting sponsor:', error);

      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.detail || error.message;
        toast.error('Failed to delete sponsor', {
          description: errorMessage,
        });
      } else {
        toast.error('Failed to delete sponsor', {
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
          <DropdownMenuItem className="cursor-pointer" onClick={() => onEdit(sponsor)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Sponsor
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setIsDeleteDialogOpen(true)}
            className="text-destructive cursor-pointer"
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete Sponsor
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteSponsorAlert
        sponsor={sponsor}
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </>
  );
};
