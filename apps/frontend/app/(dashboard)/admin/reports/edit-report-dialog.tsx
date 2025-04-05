'use client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ChildReport } from './columns';
import { EditReportForm } from './edit-report-form';

interface EditReportDialogProps {
  report: ChildReport | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReportUpdated: () => void;
  children: any[];
}

export function EditReportDialog({
  report,
  open,
  onOpenChange,
  onReportUpdated,
  children,
}: EditReportDialogProps) {
  const handleSuccess = () => {
    onOpenChange(false);
    onReportUpdated();
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  if (!report) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-brand-blue">Edit Report</DialogTitle>
          <DialogDescription>
            Update the details for the {report.report_type.toLowerCase()} report for{' '}
            {report.child_name || `Child ID: ${report.child_id}`}.
          </DialogDescription>
        </DialogHeader>
        <EditReportForm
          report={report}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
          children={children}
        />
      </DialogContent>
    </Dialog>
  );
}
