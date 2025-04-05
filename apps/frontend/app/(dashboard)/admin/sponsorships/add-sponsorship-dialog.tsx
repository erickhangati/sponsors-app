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
import { Link2 } from 'lucide-react';
import { useState } from 'react';
import { AddSponsorshipForm } from './add-sponsorship-form';

interface AddSponsorshipDialogProps {
  onSponsorshipAdded: () => void;
  sponsors: any[];
  children: any[];
}

export function AddSponsorshipDialog({
  onSponsorshipAdded,
  sponsors,
  children,
}: AddSponsorshipDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
    onSponsorshipAdded();
  };

  const handleCancel = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-9 bg-brand-blue hover:bg-brand-blue/90 cursor-pointer">
          <Link2 className="mr-2 h-4 w-4" />
          Add Sponsorship
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-brand-blue">Add New Sponsorship</DialogTitle>
          <DialogDescription>
            Create a new sponsorship relationship between a sponsor and a child. All fields marked
            with * are required.
          </DialogDescription>
        </DialogHeader>
        <AddSponsorshipForm
          onSuccess={handleSuccess}
          onCancel={handleCancel}
          sponsors={sponsors}
          children={children}
        />
      </DialogContent>
    </Dialog>
  );
}
