import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Building2, Mail, Phone, MapPin } from 'lucide-react';
import { Input } from '../components/common/Input';
import EmptyState from '../components/common/EmptyState';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import useDebounce from '../hooks/useDebounce';
import { clientApi } from '../services/api';

/**
 * Client Master — read-only listing for now.
 *
 * Backend: GET /clients returns { items: [...] }. Full CRUD (create,
 * edit, delete, template upload) will be added when we build the
 * backend endpoints.
 */
export default function ClientMaster() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const clientsQ = useQuery({
    queryKey: ['clients-all'],
    queryFn: () => clientApi.list().then((r) => r.data),
  });

  const items = clientsQ.data?.items || [];
  const filtered = items.filter((c) => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.company_legal_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <div className="mb-6">
        <h1 className="text-h1 text-slate-900">Clients</h1>
        <p className="text-body text-slate-500 mt-1">
          {items.length} client{items.length !== 1 && 's'}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-card border border-slate-200 mb-6 p-3 sm:p-4">
        <Input
          leftIcon={Search}
          placeholder="Search clients…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-lg shadow-card border border-slate-200">
        {clientsQ.isLoading ? (
          <div className="p-4"><TableSkeleton rows={4} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No clients yet"
            message={search ? 'No matches for your search.' : 'Clients will appear here once created.'}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((c) => (
              <div key={c.id} className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-full bg-primary-50 text-primary flex items-center justify-center font-semibold shrink-0">
                        {(c.name || 'C').charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-body font-semibold text-slate-900 truncate">
                          {c.name}
                        </h3>
                        <p className="text-small text-slate-500 truncate">
                          {c.company_legal_name}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-small text-slate-600">
                      <InfoItem icon={Mail} value={c.email} />
                      <InfoItem icon={Phone} value={c.phone} />
                      <InfoItem icon={MapPin} value={c.address_line1} />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-small">
                      <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-2 py-0.5">
                        {c.client_type}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-primary-50 text-primary px-2 py-0.5">
                        ${c.hourly_rate}/hr {c.currency}
                      </span>
                      {c.gst_percent > 0 && (
                        <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-2 py-0.5">
                          GST {c.gst_percent}%
                        </span>
                      )}
                      {!c.is_active && (
                        <span className="inline-flex items-center rounded-full bg-red-50 text-error px-2 py-0.5">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoItem({ icon: Icon, value }) {
  if (!value || value === '—') return null;
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      <span className="truncate">{value}</span>
    </div>
  );
}
