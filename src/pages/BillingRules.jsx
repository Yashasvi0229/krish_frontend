import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, BookOpen, Clock } from 'lucide-react';
import { Input, Select } from '../components/common/Input';
import EmptyState from '../components/common/EmptyState';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import useDebounce from '../hooks/useDebounce';
import { rulesApi } from '../services/api';

/**
 * Billing Rules — read-only reference view.
 *
 * Backend seeds 25 rules in migration 0002. UI groups by category and
 * lets the admin browse / search. CRUD comes later; for now this is a
 * quick reference so reviewers know what code to use when adding a
 * manual line item in the review screen.
 */
export default function BillingRules() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const rulesQ = useQuery({
    queryKey: ['rules'],
    queryFn: () => rulesApi.list().then((r) => r.data),
  });

  const items = rulesQ.data?.items || [];
  const categories = [...new Set(items.map((r) => r.category))].sort();

  const filtered = items.filter((r) => {
    if (category && r.category !== category) return false;
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return (
      r.code?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.category?.toLowerCase().includes(q)
    );
  });

  // Group filtered rules by category for a scannable display.
  const grouped = filtered.reduce((acc, r) => {
    (acc[r.category] = acc[r.category] || []).push(r);
    return acc;
  }, {});

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <div className="mb-6">
        <h1 className="text-h1 text-slate-900">Billing Rules</h1>
        <p className="text-body text-slate-500 mt-1">
          {items.length} rule{items.length !== 1 && 's'} · GNC Internal Hours
          Allocation Guidelines
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-card border border-slate-200 mb-6 p-3 sm:p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            leftIcon={Search}
            placeholder="Search by code, category, description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="md:col-span-2"
          />
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </div>
      </div>

      {rulesQ.isLoading ? (
        <div className="bg-white rounded-lg shadow-card border border-slate-200 p-4">
          <TableSkeleton rows={6} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No rules match"
          message="Try a different search or category filter."
        />
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([cat, rules]) => (
            <div
              key={cat}
              className="bg-white rounded-lg shadow-card border border-slate-200 overflow-hidden"
            >
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <h2 className="text-body font-semibold text-slate-800">
                  {cat} ({rules.length})
                </h2>
              </div>
              <div className="divide-y divide-slate-100">
                {rules.map((r) => (
                  <div key={r.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center px-2 py-0.5 bg-primary-50 text-primary rounded text-small font-mono font-semibold">
                            {r.code}
                          </span>
                          {!r.is_active && (
                            <span className="inline-flex items-center px-2 py-0.5 bg-red-50 text-error rounded text-small">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-body text-slate-800 mt-2">{r.description}</p>
                        {r.conditions && Object.keys(r.conditions).length > 0 && (
                          <p className="text-small text-slate-500 mt-1">
                            {Object.entries(r.conditions)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(' · ')}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 text-primary font-semibold">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{r.base_hours}</span>
                          <span className="text-small text-slate-500 font-normal">
                            hrs
                          </span>
                        </div>
                        <p className="text-small text-slate-500 mt-1">{r.uom}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
