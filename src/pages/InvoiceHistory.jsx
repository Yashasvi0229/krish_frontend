import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Plus, Search, Download, Eye, FileText, Copy, XCircle, MoreVertical,
} from 'lucide-react';
import Button from '../components/common/Button';
import { Input, Select } from '../components/common/Input';
import StatusPill from '../components/common/StatusPill';
import Pagination from '../components/common/Pagination';
import EmptyState from '../components/common/EmptyState';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import ConfirmModal from '../components/common/ConfirmModal';
import useDebounce from '../hooks/useDebounce';
import { invoiceApi, clientApi } from '../services/api';
import { formatCurrencyPrefixed, formatDate } from '../utils/formatters';

/**
 * Invoice History — with per-row cancel and duplicate actions.
 *
 * Endpoints:
 *   GET    /api/invoices                    → list with filters
 *   GET    /api/invoices/{id}/download      → xlsx blob
 *   POST   /api/invoices/{id}/duplicate     → new draft
 *   DELETE /api/invoices/{id}               → cancel (soft)
 */
export default function InvoiceHistory() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [clientId, setClientId] = useState('');
  const [page, setPage] = useState(1);
  const [confirmCancel, setConfirmCancel] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const pageSize = 20;
  const debouncedSearch = useDebounce(search, 300);

  const invoicesQ = useQuery({
    queryKey: ['invoices-history', status, clientId, page],
    queryFn: () =>
      invoiceApi
        .list({
          status: status || undefined,
          client_id: clientId || undefined,
          limit: pageSize,
          offset: (page - 1) * pageSize,
        })
        .then((r) => r.data),
    keepPreviousData: true,
  });

  const clientsQ = useQuery({
    queryKey: ['clients-active'],
    queryFn: () => clientApi.list({ status: 'active' }).then((r) => r.data),
    refetchOnWindowFocus: false,
  });

  const cancelM = useMutation({
    mutationFn: ({ id, reason }) => invoiceApi.cancel(id, { reason }),
    onSuccess: () => {
      toast.success('Invoice cancelled');
      qc.invalidateQueries({ queryKey: ['invoices-history'] });
      setConfirmCancel(null);
    },
    onError: (e) => toast.error(e?.response?.data?.detail || 'Failed'),
  });

  const duplicateM = useMutation({
    mutationFn: (id) => invoiceApi.duplicate(id, {}),
    onSuccess: (res) => {
      const draftId = res.data?.draft_id;
      toast.success('Duplicate created');
      if (draftId) navigate(`/invoices/review/${draftId}`);
    },
    onError: (e) => toast.error(e?.response?.data?.detail || 'Failed'),
  });

  const download = async (id, invoiceNo) => {
    try {
      const res = await invoiceApi.download(id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoiceNo}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download');
    }
  };

  // Close 3-dot menu on outside click
  React.useEffect(() => {
    const handler = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener('click', handler);
      return () => document.removeEventListener('click', handler);
    }
  }, [openMenuId]);

  const items = invoicesQ.data?.items || [];
  const total = invoicesQ.data?.total || 0;
  const filtered = items.filter((inv) => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return (
      inv.invoice_no?.toLowerCase().includes(q) ||
      inv.claim_no?.toLowerCase().includes(q) ||
      inv.client_name?.toLowerCase().includes(q) ||
      inv.insured_name?.toLowerCase().includes(q)
    );
  });

  const RowActions = ({ inv }) => (
    <div className="flex items-center justify-end gap-1">
      <button
        onClick={() => navigate(`/invoices/${inv.id}/preview`)}
        className="p-2 rounded hover:bg-slate-100 text-slate-600"
        title="View"
      >
        <Eye className="h-4 w-4" />
      </button>
      <button
        onClick={() => download(inv.id, inv.invoice_no)}
        className="p-2 rounded hover:bg-slate-100 text-slate-600"
        title="Download"
      >
        <Download className="h-4 w-4" />
      </button>
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpenMenuId(openMenuId === inv.id ? null : inv.id);
          }}
          className="p-2 rounded hover:bg-slate-100 text-slate-600"
          title="More"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {openMenuId === inv.id && (
          <div
            className="absolute right-0 mt-1 w-44 rounded-md border border-slate-200 bg-white shadow-lg py-1 z-30"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setOpenMenuId(null);
                duplicateM.mutate(inv.id);
              }}
              className="w-full text-left px-3 py-2 text-body hover:bg-slate-50 flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Duplicate
            </button>
            {inv.status !== 'CANCELLED' && (
              <button
                onClick={() => {
                  setOpenMenuId(null);
                  setConfirmCancel(inv);
                }}
                className="w-full text-left px-3 py-2 text-body hover:bg-red-50 text-error flex items-center gap-2"
              >
                <XCircle className="h-4 w-4" />
                Cancel Invoice
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-h1 text-slate-900">Invoice History</h1>
          <p className="text-body text-slate-500 mt-1">
            {total} invoice{total !== 1 && 's'}
          </p>
        </div>
        <Button leftIcon={Plus} onClick={() => navigate('/invoices/new')}>
          Create New
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-card border border-slate-200 mb-6 p-3 sm:p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            leftIcon={Search}
            placeholder="Search invoice, claim, client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="md:col-span-2"
          />
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="SENT">Sent</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
          <Select value={clientId} onChange={(e) => { setClientId(e.target.value); setPage(1); }}>
            <option value="">All clients</option>
            {(clientsQ.data?.items || []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-card border border-slate-200">
        {invoicesQ.isLoading ? (
          <div className="p-4"><TableSkeleton rows={5} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No invoices"
            message="No invoices match the current filters."
          />
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Claim</th>
                    <th>Client</th>
                    <th>Insured</th>
                    <th className="text-right">Amount</th>
                    <th>Status</th>
                    <th>Period</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => (
                    <tr key={inv.id}>
                      <td>
                        <button
                          onClick={() => navigate(`/invoices/${inv.id}/preview`)}
                          className="text-primary hover:underline font-medium"
                        >
                          {inv.invoice_no}
                        </button>
                      </td>
                      <td>{inv.claim_no || '—'}</td>
                      <td>{inv.client_name || '—'}</td>
                      <td>{inv.insured_name || '—'}</td>
                      <td className="text-right font-semibold">
                        {formatCurrencyPrefixed(inv.amount, inv.currency)}
                      </td>
                      <td><StatusPill status={inv.status} /></td>
                      <td className="text-small text-slate-600">
                        {formatDate(inv.billing_period_start)} → {formatDate(inv.billing_period_end)}
                      </td>
                      <td className="text-right"><RowActions inv={inv} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-slate-100">
              {filtered.map((inv) => (
                <div key={inv.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => navigate(`/invoices/${inv.id}/preview`)}
                      className="text-body font-semibold text-primary text-left"
                    >
                      {inv.invoice_no}
                    </button>
                    <StatusPill status={inv.status} />
                  </div>
                  <p className="text-small text-slate-500 mt-1">
                    {inv.claim_no || '—'} · {inv.client_name || '—'}
                  </p>
                  <p className="text-small text-slate-500">{inv.insured_name}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-body font-semibold">
                      {formatCurrencyPrefixed(inv.amount, inv.currency)}
                    </span>
                    <RowActions inv={inv} />
                  </div>
                </div>
              ))}
            </div>

            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              showPageSize={false}
            />
          </>
        )}
      </div>

      <ConfirmModal
        open={!!confirmCancel}
        onClose={() => setConfirmCancel(null)}
        onConfirm={() => cancelM.mutate({
          id: confirmCancel.id,
          reason: 'Cancelled from history view'
        })}
        title="Cancel this invoice?"
        message={`Invoice ${confirmCancel?.invoice_no} will be marked as CANCELLED. The Excel file stays available.`}
        confirmText="Cancel Invoice"
        variant="danger"
        loading={cancelM.isPending}
      />
    </div>
  );
}
