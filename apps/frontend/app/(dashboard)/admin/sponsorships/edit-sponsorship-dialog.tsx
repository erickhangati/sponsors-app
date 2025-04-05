'use client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Sponsorship } from './columns';
import { EditSponsorshipForm } from './edit-sponsorship-form';

interface EditSponsorshipDialogProps {
  sponsorship: Sponsorship | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSponsorshipUpdated: () => void;
  sponsors: any[];
  children: any[];
}

export function EditSponsorshipDialog({
  sponsorship,
  open,
  onOpenChange,
  onSponsorshipUpdated,
  sponsors,
  children,
}: EditSponsorshipDialogProps) {
  const handleSuccess = () => {
    onOpenChange(false);
    onSponsorshipUpdated();
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  if (!sponsorship) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-brand-blue">Edit Sponsorship</DialogTitle>
          <DialogDescription>
            Update the details for the sponsorship between {sponsorship.sponsor_name} and{' '}
            {sponsorship.child_name}.
          </DialogDescription>
        </DialogHeader>
        <EditSponsorshipForm
          sponsorship={sponsorship}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
          sponsors={sponsors}
          children={children}
        />
      </DialogContent>
    </Dialog>
  );
}
