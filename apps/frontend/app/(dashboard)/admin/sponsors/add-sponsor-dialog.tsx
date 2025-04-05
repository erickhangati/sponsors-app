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
import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import { AddSponsorForm } from './add-sponsor-form';

interface AddSponsorDialogProps {
  onSponsorAdded: () => void;
}

export function AddSponsorDialog({ onSponsorAdded }: AddSponsorDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
    onSponsorAdded();
  };

  const handleCancel = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-9 bg-brand-blue hover:bg-brand-blue/80 cursor-pointer">
          <UserPlus className="mr-2 h-4 w-4" />
          Add Sponsor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-brand-blue">Add New Sponsor</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new sponsor account. All fields marked with * are
            required.
          </DialogDescription>
        </DialogHeader>
        <AddSponsorForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </DialogContent>
    </Dialog>
  );
}
