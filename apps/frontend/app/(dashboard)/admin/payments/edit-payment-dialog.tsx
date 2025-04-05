'use client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Payment } from './columns';
import { EditPaymentForm } from './edit-payment-form';

interface EditPaymentDialogProps {
  payment: Payment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentUpdated: () => void;
  sponsors: any[];
  children: any[];
}

export function EditPaymentDialog({
  payment,
  open,
  onOpenChange,
  onPaymentUpdated,
  sponsors,
  children,
}: EditPaymentDialogProps) {
  const handleSuccess = () => {
    onOpenChange(false);
    onPaymentUpdated();
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-brand-blue">Edit Payment</DialogTitle>
          <DialogDescription>
            Update the details for the payment of {payment.currency} {payment.amount} from{' '}
            {payment.sponsor_name} for {payment.child_name}.
          </DialogDescription>
        </DialogHeader>
        <EditPaymentForm
          payment={payment}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
          sponsors={sponsors}
          children={children}
        />
      </DialogContent>
    </Dialog>
  );
}
