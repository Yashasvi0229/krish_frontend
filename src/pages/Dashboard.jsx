import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Plus,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Search,
  Eye,
  Download,
} from 'lucide-react';
import Button from '../components/common/Button';
import { Input, Select } from '../components/common/Input';
import StatusPill from '../components/common/StatusPill';
import EmptyState from '../components/common/EmptyState';
import Pagination from '../components/common/Pagination';
import { TableSkeleton, StatCardSkeleton } from '../components/common/LoadingSkeleton';
import useAuth from '../hooks/useAuth';
import useDebounce from '../hooks/useDebounce';
import { dashboardApi, invoiceApi, clientApi, draftApi } from '../services/api';
import {
  formatCurrencyPrefixed,
  formatDate,
  formatFullDate,
} from '../utils/formatters';

/**
 * Dashboard — landing page after login.
 *
 * Layout:
 *   * Header: welcome + "Create New Invoice" CTA
 *   * 4 stat cards (from /dashboard/stats)
 *   * Filter bar (status / client / search)
 *   * Invoice table with pagination
 *
 * Backend endpoints used:
 *   GET /dashboard/stats          — 4 numbers
 *   GET /invoices?...             — list with filters
 *   GET /clients?status=active    — dropdown options
 *
 * Responsive rules:
 *   * Header stacks on <sm (button below title, full width)
 *   * Stat cards: 1 col / 2 col / 4 col at sm/md/xl
 *   * Filter bar: stacks vertically on <md
 *   * Table: horizontal scroll on <lg (min-w on inner div); a card view
 *     could replace it later if needed but scroll is acceptable for
 *     ~10 rows.
 */
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [clientId, setClientId] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const debouncedSearch = useDebounce(search, 300);

  // Stats
  const statsQ = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.getStats().then((r) => r.data),
    refetchOnWindowFocus: false,
  });

  // Pending drafts — everything the reviewer needs to look at.
  // Kept small (limit 5) so the section reads at a glance; user can
  // click "See all" to jump to a dedicated view later.
  const pendingDraftsQ = useQuery({
    queryKey: ['dashboard-pending-drafts'],
    queryFn: () =>
      draftApi.list({ pending: true, limit: 5, offset: 0 }).then((r) => r.data),
    refetchOnWindowFocus: false,
  });

  // Invoices list — backend uses offset/limit not page/limit
  const invoicesQ = useQuery({
    queryKey: ['dashboard-invoices', debouncedSearch, status, clientId, page],
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

  // Clients for filter dropdown
  const clientsQ = useQuery({
    queryKey: ['clients-active'],
    queryFn: () => clientApi.list({ status: 'active' }).then((r) => r.data),
    refetchOnWindowFocus: false,
  });

  const downloadInvoice = async (id, invoiceNo) => {
    try {
      const res = await invoiceApi.download(id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoiceNo}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch {
      toast.error('Failed to download invoice');
    }
  };

  const resetFilters = () => {
    setSearch('');
    setStatus('');
    setClientId('');
    setPage(1);
  };

  // Filter by search client-side (backend list doesn't have text search yet)
  const filteredItems = (invoicesQ.data?.items || []).filter((inv) => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return (
      inv.invoice_no?.toLowerCase().includes(q) ||
      inv.claim_no?.toLowerCase().includes(q) ||
      inv.client_name?.toLowerCase().includes(q) ||
      inv.insured_name?.toLowerCase().includes(q)
    );
  });

  const total = invoicesQ.data?.total || 0;
  const hasFilters = Boolean(search || status || clientId);
  const isEmpty = !invoicesQ.isLoading && filteredItems.length === 0 && !hasFilters;
  const isFilteredEmpty =
    !invoicesQ.isLoading && filteredItems.length === 0 && hasFilters;

  const stats = statsQ.data;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 sm:py-6">
      {/* Header — stacks on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-h1 text-slate-900">
            Welcome back, {user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'}
          </h1>
          <p className="text-body text-slate-500 mt-1">
            Today is {formatFullDate()}
          </p>
        </div>
        <Button
          leftIcon={Plus}
          size="lg"
          onClick={() => navigate('/invoices/new')}
          className="w-full sm:w-auto"
        >
          Create New Invoice
        </Button>
      </div>

      {/* Stat cards — 1 col / 2 col / 4 col responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {statsQ.isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              icon={FileText}
              iconColor="text-primary bg-primary-50"
              label="Total This Month"
              value={`${stats?.total_this_month?.count ?? 0} invoices`}
              subText={`${formatCurrencyPrefixed(
                stats?.total_this_month?.amount ?? 0
              )} total`}
            />
            <StatCard
              icon={Clock}
              iconColor="text-yellow-600 bg-yellow-50"
              label="Pending Review"
              value={`${stats?.pending_review ?? 0} drafts`}
              subText="Requires your attention"
              onClick={
                (pendingDraftsQ.data?.items?.length ?? 0) > 0
                  ? () => {
                      // Smooth-scroll to the pending drafts section that
                      // renders below when there's at least one item.
                      document
                        .querySelector('[data-pending-drafts]')
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  : undefined
              }
            />
            <StatCard
              icon={CheckCircle}
              iconColor="text-success bg-green-50"
              label="Approved"
              value={`${stats?.approved ?? 0} invoices`}
              subText="Ready to send"
              onClick={() => {
                setStatus('APPROVED');
                setPage(1);
              }}
            />
            <StatCard
              icon={AlertTriangle}
              iconColor="text-flagged bg-orange-50"
              label="Flagged"
              value={`${stats?.flagged ?? 0} items`}
              subText="Needs manual review"
            />
          </>
        )}
      </div>

      {/* Pending Reviews section — visible if there's any pending work */}
      {pendingDraftsQ.data?.items?.length > 0 && (
        <div
          data-pending-drafts
          className="bg-white rounded-lg shadow-card border border-yellow-200 mb-6 overflow-hidden"
        >
          <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <h2 className="text-h3 text-slate-900">
                Pending Reviews ({pendingDraftsQ.data.total})
              </h2>
            </div>
            <p className="text-small text-slate-500 hidden sm:block">
              Drafts waiting for your attention
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {pendingDraftsQ.data.items.map((d) => (
              <button
                key={d.id}
                onClick={() => navigate(`/invoices/review/${d.id}`)}
                className="w-full text-left p-3 sm:p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-body font-semibold text-primary">
                        {d.invoice_no}
                      </span>
                      <StatusPill status={d.status} />
                      {d.has_duplicate_warning && (
                        <span className="inline-flex items-center gap-1 text-small text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="h-3 w-3" />
                          Duplicate
                        </span>
                      )}
                    </div>
                    <p className="text-small text-slate-600 mt-1 truncate">
                      {d.client_name || '—'} · {d.insured_name || '—'}
                      {d.claim_no && ` · Claim ${d.claim_no}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-body font-semibold text-slate-900">
                      {formatCurrencyPrefixed(d.grand_total, d.currency)}
                    </p>
                    <p className="text-small text-slate-500">
                      Created {formatDate(d.created_at)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter bar — stacks on <md */}
      <div className="bg-white rounded-lg shadow-card border border-slate-200 mb-6 p-3 sm:p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            leftIcon={Search}
            placeholder="Search invoice #, claim, insured…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="md:col-span-2"
          />
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="PAID">Paid</option>
            <option value="VOID">Void</option>
          </Select>
          <Select
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All clients</option>
            {(clientsQ.data?.items || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        {hasFilters && (
          <button
            onClick={resetFilters}
            className="mt-3 text-small text-primary hover:underline"
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Invoice list */}
      <div className="bg-white rounded-lg shadow-card border border-slate-200">
        {invoicesQ.isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={5} />
          </div>
        ) : isEmpty ? (
          <EmptyState
            icon={FileText}
            title="No invoices yet"
            message="Create your first invoice to get started."
            action={
              <Button leftIcon={Plus} onClick={() => navigate('/invoices/new')}>
                Create New Invoice
              </Button>
            }
          />
        ) : isFilteredEmpty ? (
          <EmptyState
            icon={Search}
            title="No matches"
            message="No invoices match your filters. Try adjusting them."
            action={
              <Button variant="secondary" onClick={resetFilters}>
                Reset filters
              </Button>
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th className="text-left">Invoice #</th>
                    <th className="text-left">Claim #</th>
                    <th className="text-left">Client</th>
                    <th className="text-left">Insured</th>
                    <th className="text-right">Amount</th>
                    <th className="text-left">Status</th>
                    <th className="text-left">Date</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((inv) => (
                    <tr key={inv.id}>
                      <td>
                        <Link
                          to={`/invoices/${inv.id}/preview`}
                          className="text-primary hover:underline font-medium"
                        >
                          {inv.invoice_no}
                        </Link>
                      </td>
                      <td className="text-slate-700">{inv.claim_no || '—'}</td>
                      <td className="text-slate-700">
                        {inv.client_name || '—'}
                      </td>
                      <td className="text-slate-700">
                        {inv.insured_name || '—'}
                      </td>
                      <td className="text-right font-semibold text-slate-900">
                        {formatCurrencyPrefixed(inv.amount, inv.currency)}
                      </td>
                      <td>
                        <StatusPill status={inv.status} />
                      </td>
                      <td className="text-slate-600">
                        {formatDate(inv.approved_at)}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() =>
                              navigate(`/invoices/${inv.id}/preview`)
                            }
                            className="p-2 rounded hover:bg-slate-100 text-slate-600"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() =>
                              downloadInvoice(inv.id, inv.invoice_no)
                            }
                            className="p-2 rounded hover:bg-slate-100 text-slate-600"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list — same data in a scannable format */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredItems.map((inv) => (
                <div key={inv.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/invoices/${inv.id}/preview`}
                        className="text-body font-semibold text-primary hover:underline block"
                      >
                        {inv.invoice_no}
                      </Link>
                      <p className="text-small text-slate-500 mt-0.5">
                        {inv.claim_no || 'No claim #'} · {formatDate(inv.approved_at)}
                      </p>
                    </div>
                    <StatusPill status={inv.status} />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-small">
                    <div>
                      <p className="text-slate-500">Client</p>
                      <p className="text-slate-800 truncate">
                        {inv.client_name || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Insured</p>
                      <p className="text-slate-800 truncate">
                        {inv.insured_name || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-body font-semibold text-slate-900">
                      {formatCurrencyPrefixed(inv.amount, inv.currency)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          navigate(`/invoices/${inv.id}/preview`)
                        }
                        className="p-2 rounded hover:bg-slate-100 text-slate-600"
                        aria-label="View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() =>
                          downloadInvoice(inv.id, inv.invoice_no)
                        }
                        className="p-2 rounded hover:bg-slate-100 text-slate-600"
                        aria-label="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
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
    </div>
  );
}

function StatCard({ icon: Icon, iconColor, label, value, subText, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`bg-white rounded-lg shadow-card border border-slate-200 p-4 sm:p-5 text-left w-full ${
        onClick ? 'hover:shadow-card-hover transition-shadow cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-small text-slate-500 mb-1">{label}</p>
          <p className="text-h2 font-semibold text-slate-900 truncate">
            {value}
          </p>
          <p className="text-small text-slate-500 mt-1 truncate">{subText}</p>
        </div>
        <div className={`p-2 rounded-lg ${iconColor} shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </button>
  );
}
