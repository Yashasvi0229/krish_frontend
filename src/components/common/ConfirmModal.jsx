import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { AlertTriangle } from 'lucide-react';

/**
 * Confirmation modal used for destructive/irreversible actions.
 * Spec references: Dashboard delete (4.3), Bulk delete (9.3),
 * Cancel Processing (6.3), Reject Invoice (7.6), etc.
 */
export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="flex gap-3 items-start">
        <div className="flex-shrink-0 rounded-full bg-red-100 p-2">
          <AlertTriangle className="h-5 w-5 text-error" />
        </div>
        <p className="text-body text-slate-700 pt-1">{message}</p>
      </div>
    </Modal>
  );
}
