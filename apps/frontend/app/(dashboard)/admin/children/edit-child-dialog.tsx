'use client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Child } from './columns';
import { EditChildForm } from './edit-child-form';

interface EditChildDialogProps {
  child: Child | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChildUpdated: () => void;
}

export function EditChildDialog({
  child,
  open,
  onOpenChange,
  onChildUpdated,
}: EditChildDialogProps) {
  const handleSuccess = () => {
    onOpenChange(false);
    onChildUpdated();
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  if (!child) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-brand-blue">Edit Child</DialogTitle>
          <DialogDescription>
            Update the details for {child.first_name} {child.last_name}.
          </DialogDescription>
        </DialogHeader>
        <EditChildForm child={child} onSuccess={handleSuccess} onCancel={handleCancel} />
      </DialogContent>
    </Dialog>
  );
}
