'use client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Sponsor } from './columns';
import { EditSponsorForm } from './edit-sponsor-form';

interface EditSponsorDialogProps {
  sponsor: Sponsor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSponsorUpdated: () => void;
}

export function EditSponsorDialog({
  sponsor,
  open,
  onOpenChange,
  onSponsorUpdated,
}: EditSponsorDialogProps) {
  const handleSuccess = () => {
    onOpenChange(false);
    onSponsorUpdated();
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  if (!sponsor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-brand-blue">Edit Sponsor</DialogTitle>
          <DialogDescription>
            Update the details for {sponsor.first_name} {sponsor.last_name}.
          </DialogDescription>
        </DialogHeader>
        <EditSponsorForm sponsor={sponsor} onSuccess={handleSuccess} onCancel={handleCancel} />
      </DialogContent>
    </Dialog>
  );
}
