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
import { PlusCircle } from 'lucide-react';
import { useState } from 'react';
import { AddPaymentForm } from './add-payment-form';

interface AddPaymentDialogProps {
  onPaymentAdded: () => void;
  sponsors: any[];
  children: any[];
}

export function AddPaymentDialog({ onPaymentAdded, sponsors, children }: AddPaymentDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
    onPaymentAdded();
  };

  const handleCancel = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-9 bg-brand-blue hover:bg-brand-blue/90 cursor-pointer">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-brand-blue">Add New Payment</DialogTitle>
          <DialogDescription>
            Record a new payment from a sponsor to a child. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        <AddPaymentForm
          onSuccess={handleSuccess}
          onCancel={handleCancel}
          sponsors={sponsors}
          children={children}
        />
      </DialogContent>
    </Dialog>
  );
}
