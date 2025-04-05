'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Eye } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Define the SponsoredChild type
export interface SponsoredChild {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  phone_number: string;
  date_of_birth: string;
  gender: string;
  background_info: string;
  profile_image: string | null;
  is_active: boolean;
}

// Helper function to calculate age from date of birth
function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age;
}

// Helper function to get initials from name
function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

// Define the columns for the data table
export const columns: ColumnDef<SponsoredChild, unknown>[] = [
  {
    accessorKey: 'profile_image',
    header: 'Profile',
    cell: ({ row }) => {
      const child = row.original;
      return (
        <Avatar>
          <AvatarImage
            src={child.profile_image || ''}
            alt={`${child.first_name} ${child.last_name}`}
          />
          <AvatarFallback>{getInitials(child.first_name, child.last_name)}</AvatarFallback>
        </Avatar>
      );
    },
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => {
      const child = row.original;
      return (
        <div>
          <div className="font-medium">{`${child.first_name} ${child.last_name}`}</div>
          <div className="text-sm text-muted-foreground">{child.email}</div>
        </div>
      );
    },
  },
  {
    accessorKey: 'gender',
    header: 'Gender',
    cell: ({ row }) => row.original.gender,
  },
  {
    accessorKey: 'age',
    header: 'Age',
    cell: ({ row }) => {
      const child = row.original;
      return child.date_of_birth ? calculateAge(child.date_of_birth) : 'N/A';
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const isActive = row.original.is_active;
      return isActive ? (
        <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-green-50 text-green-600 border border-green-200">
          Active
        </span>
      ) : (
        <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
          Inactive
        </span>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const child = row.original;
      return (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" asChild className="cursor-pointer">
            <Link href={`/sponsors/children/${child.id}`}>
              <Eye className="mr-2 h-4 w-4" />
              View details
            </Link>
          </Button>
        </div>
      );
    },
  },
];
