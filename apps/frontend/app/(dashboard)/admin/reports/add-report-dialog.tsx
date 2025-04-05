'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { useState } from 'react';
import { AddReportForm } from './add-report-form';

interface AddReportDialogProps {
  onReportAdded: () => void;
  children: any[];
}

export function AddReportDialog({ onReportAdded, children }: AddReportDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
    onReportAdded();
  };

  const handleCancel = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-9 bg-brand-blue hover:bg-brand-blue/90 cursor-pointer">
          <FileText className="mr-2 h-4 w-4" />
          Add Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-brand-blue">Add New Report</DialogTitle>
          <DialogDescription>
            Create a new report for a child. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        <AddReportForm onSuccess={handleSuccess} onCancel={handleCancel} children={children} />
      </DialogContent>
    </Dialog>
  );
}
