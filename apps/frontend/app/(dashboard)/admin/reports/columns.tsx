'use client';

import type React from 'react';

import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

import type { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Pencil, Trash2, Eye, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

// Import AlertDialog components
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
import { useState } from 'react';

// Define the ChildReport type
export type ChildReport = {
  id: number;
  child_id: number;
  child_name?: string;
  report_date: string;
  report_type: string;
  details: string;
  status: 'read' | 'unread';
};

// Function to get report type badge variant
const getReportTypeBadgeVariant = (type: string) => {
  switch (type.toLowerCase()) {
    case 'academic':
    case 'education':
      return 'blue';
    case 'health':
      return 'green';
    case 'social':
      return 'yellow';
    case 'behavioral':
      return 'orange';
    case 'financial':
      return 'purple';
    default:
      return 'default';
  }
};

// Function to get report status badge variant
const getReportStatusBadge = (status: string) => {
  return status === 'read' ? (
    <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
      <CheckCircle className="mr-1 h-3 w-3" /> Read
    </Badge>
  ) : (
    <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">
      Unread
    </Badge>
  );
};

interface DeleteReportAlertProps {
  report: ChildReport;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

function DeleteReportAlert({
  report,
  isOpen,
  onClose,
  onConfirm,
  isDeleting = false,
}: DeleteReportAlertProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-600">Delete Report</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this report? This action cannot be undone.
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
            className="bg-red-600 hover:bg-red-700 cursor-pointer"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Define the columns for the reports table
export const ReportsColumns = (
  onEdit: (report: ChildReport) => void,
  onDelete: (report: ChildReport) => void,
  onViewDetails: (report: ChildReport) => void,
): ColumnDef<ChildReport>[] => {
  return [
    {
      accessorKey: 'id',
      header: 'ID',
    },
    {
      accessorKey: 'child_name',
      header: 'Child',
      cell: ({ row }) => {
        const childName = row.getValue('child_name') as string;
        const childId = row.original.child_id;

        return childName || `Child ID: ${childId}`;
      },
    },
    {
      accessorKey: 'report_date',
      header: 'Date',
      cell: ({ row }) => {
        const date = row.getValue('report_date') as string;
        return format(new Date(date), 'MMM d, yyyy');
      },
    },
    {
      accessorKey: 'report_type',
      header: 'Type',
      cell: ({ row }) => {
        const type = row.getValue('report_type') as string;
        const variant = getReportTypeBadgeVariant(type);

        return (
          <Badge variant={variant as any} className="capitalize">
            {type}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return getReportStatusBadge(status);
      },
    },
    {
      accessorKey: 'details',
      header: 'Details',
      cell: ({ row }) => {
        const details = row.getValue('details') as string;
        // Truncate long details for display
        return details.length > 50 ? `${details.substring(0, 50)}...` : details;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const report = row.original;
        return (
          <ReportActions
            report={report}
            onEdit={onEdit}
            onDelete={onDelete}
            onViewDetails={onViewDetails}
          />
        );
      },
    },
  ];
};

interface ReportActionsProps {
  report: ChildReport;
  onEdit: (report: ChildReport) => void;
  onDelete: (report: ChildReport) => void;
  onViewDetails: (report: ChildReport) => void;
}

const ReportActions: React.FC<ReportActionsProps> = ({
  report,
  onEdit,
  onDelete,
  onViewDetails,
}) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      onDelete(report);
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
          <DropdownMenuItem onClick={() => onViewDetails(report)} className="cursor-pointer">
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onEdit(report)} className="cursor-pointer">
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setIsDeleteDialogOpen(true)}
            className="text-red-600 focus:text-red-600 cursor-pointer flex items-center justify-start gap-4"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteReportAlert
        report={report}
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </>
  );
};
