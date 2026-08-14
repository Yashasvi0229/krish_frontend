import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Download, ArrowLeft, ExternalLink, Copy, XCircle } from 'lucide-react';
import Button from '../components/common/Button';
import Breadcrumb from '../components/common/Breadcrumb';
import StatusPill from '../components/common/StatusPill';
import ConfirmModal from '../components/common/ConfirmModal';
import { Skeleton } from '../components/common/LoadingSkeleton';
import { invoiceApi } from '../services/api';
import { formatCurrencyPrefixed, formatDate } from '../utils/formatters';

/**
 * Invoice preview — post-approval landing page.
 *
 * Backend GET /invoices/{id} returns:
 *   { id, invoice_no, snapshot_data (frozen at approval time),
 *     amount, currency, status, billing_period_*, approved_at,
 *     excel_path, excel_file_size }
 *
 * We surface the snapshot as a friendly summary and offer the download
 * button. Email / duplicate / bulk actions from the mockup are omitted
 * — backend doesn't have those endpoints yet.
 *
 * Responsive: two columns on desktop (details left, summary right),
 * single column on mobile.
 */
export default function InvoicePreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const invoiceQ = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoiceApi.get(id).then((r) => r.data),
  });

  const duplicateM = useMutation({
    mutationFn: () => invoiceApi.duplicate(id, {}),
    onSuccess: (res) => {
      const draftId = res.data?.draft_id;
      toast.success('Duplicate created');
      if (draftId) navigate(`/invoices/review/${draftId}`);
    },
    onError: (e) => toast.error(e?.response?.data?.detail || 'Failed'),
  });

  const cancelM = useMutation({
    mutationFn: () => invoiceApi.cancel(id, { reason: 'Cancelled from preview' }),
    onSuccess: () => {
      toast.success('Invoice cancelled');
      invoiceQ.refetch();
      setConfirmCancel(false);
    },
    onError: (e) => toast.error(e?.response?.data?.detail || 'Failed'),
  });

  const download = async () => {
    try {
      const res = await invoiceApi.download(id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoiceQ.data?.invoice_no || 'invoice'}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch {
      toast.error('Failed to download');
    }
  };

  if (invoiceQ.isLoading) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 space-y-4">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }
  if (invoiceQ.isError) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <p className="text-body text-slate-600 mb-3">Invoice not found.</p>
        <Button onClick={() => navigate('/dashboard')}>Back to dashboard</Button>
      </div>
    );
  }

  const inv = invoiceQ.data;
  const snap = inv.snapshot_data || {};
  const client = snap.client_details || {};
  const insured = snap.insured_details || {};
  const loss = snap.loss_details || {};
  const lines = (snap.line_items || []).filter((l) => !l.removed);

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Invoices', href: '/invoices' },
          { label: inv.invoice_no },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded hover:bg-slate-100 text-slate-600"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-h1 text-slate-900">{inv.invoice_no}</h1>
            <StatusPill status={inv.status} />
          </div>
          <p className="text-body text-slate-500 mt-1 ml-11">
            {client.name} · Approved {formatDate(inv.approved_at)}
          </p>
        </div>
        <Button leftIcon={Download} size="lg" onClick={download}>
          Download Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-lg shadow-card border border-slate-200 p-4 sm:p-5">
            <h3 className="text-body font-semibold text-slate-800 mb-3">
              Invoice Info
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-body">
              <Field label="Invoice #" value={inv.invoice_no} />
              <Field label="Invoice Date" value={snap.invoice_date || '—'} />
              <Field label="GNC File #" value={snap.gnc_file_no || '—'} />
              <Field
                label="Billing Period"
                value={`${inv.billing_period_start} → ${inv.billing_period_end}`}
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-card border border-slate-200 p-4 sm:p-5">
            <h3 className="text-body font-semibold text-slate-800 mb-3">
              Client
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-body">
              <Field label="Name" value={client.name} />
              <Field label="Email" value={client.email} />
              <Field label="Phone" value={client.phone} />
              <Field label="Address" value={client.address_line1} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-card border border-slate-200 p-4 sm:p-5">
            <h3 className="text-body font-semibold text-slate-800 mb-3">
              Insured & Loss
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-body">
              <Field label="Insured" value={insured.insured_name} />
              <Field label="Claim #" value={loss.claim_no} />
              <Field label="Loss Type" value={loss.loss_type} />
              <Field label="Date of Loss" value={loss.date_of_loss} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-card border border-slate-200 p-4 sm:p-5">
            <h3 className="text-body font-semibold text-slate-800 mb-3">
              Line Items ({lines.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-body">
                <thead className="bg-slate-50 text-small text-slate-600 uppercase">
                  <tr>
                    <th className="text-left py-2 px-2">#</th>
                    <th className="text-left py-2 px-2">Description</th>
                    <th className="text-right py-2 px-2">Hrs</th>
                    <th className="text-right py-2 px-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.line_number} className="border-t border-slate-100">
                      <td className="py-2 px-2 text-slate-500">{line.line_number}</td>
                      <td className="py-2 px-2">
                        {line.description}
                        <p className="text-small text-slate-500">
                          {line.rule_code}
                        </p>
                      </td>
                      <td className="py-2 px-2 text-right">
                        {Number(line.quantity_hours || 0).toFixed(2)}
                      </td>
                      <td className="py-2 px-2 text-right font-medium">
                        ${Number(line.total || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column — totals + actions */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-card border border-slate-200 p-4 sm:p-5">
            <h3 className="text-body font-semibold text-slate-800 mb-3">
              Summary
            </h3>
            <div className="space-y-2 text-body">
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal</span>
                <span>
                  {formatCurrencyPrefixed(snap.subtotal || 0, inv.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">
                  GST ({snap.gst_percent || 0}%)
                </span>
                <span>
                  {formatCurrencyPrefixed(snap.gst_value || 0, inv.currency)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 text-h3">
                <span>Total</span>
                <span className="text-primary font-bold">
                  {formatCurrencyPrefixed(inv.amount, inv.currency)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-card border border-slate-200 p-4 sm:p-5 space-y-2">
            <Button leftIcon={Download} fullWidth onClick={download}>
              Download Excel
            </Button>
            <Button
              variant="secondary"
              leftIcon={Copy}
              fullWidth
              onClick={() => duplicateM.mutate()}
              loading={duplicateM.isPending}
            >
              Duplicate as Draft
            </Button>
            <Button
              variant="secondary"
              leftIcon={ExternalLink}
              fullWidth
              onClick={() => navigate(`/invoices/review/${snap.approved_from_draft_id}`)}
              disabled={!snap.approved_from_draft_id}
            >
              View Original Draft
            </Button>
            {inv.status !== 'CANCELLED' && (
              <Button
                variant="dangerText"
                leftIcon={XCircle}
                fullWidth
                onClick={() => setConfirmCancel(true)}
              >
                Cancel Invoice
              </Button>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => cancelM.mutate()}
        title="Cancel this invoice?"
        message={`Invoice ${inv.invoice_no} will be marked as CANCELLED. The Excel file stays downloadable for reference.`}
        confirmText="Cancel Invoice"
        variant="danger"
        loading={cancelM.isPending}
      />
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-small text-slate-500">{label}</p>
      <p className="text-body text-slate-800 truncate">{value || '—'}</p>
    </div>
  );
}
