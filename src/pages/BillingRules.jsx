import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  Search, BookOpen, Clock, Plus, Edit2, Trash2,
} from 'lucide-react';
import Button from '../components/common/Button';
import { Input, Select, Textarea } from '../components/common/Input';
import EmptyState from '../components/common/EmptyState';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import Modal from '../components/common/Modal';
import ConfirmModal from '../components/common/ConfirmModal';
import useDebounce from '../hooks/useDebounce';
import { rulesApi } from '../services/api';

/**
 * Billing Rules — full CRUD.
 *
 * Endpoints:
 *   GET    /api/rules
 *   POST   /api/rules
 *   PATCH  /api/rules/{id}
 *   DELETE /api/rules/{id}
 *
 * Design note: rules are grouped by `category` for scannability. Edits
 * bump `version` on the backend so audit trail always reflects who
 * changed what and when.
 */
const schema = z.object({
  code: z.string().trim().min(1, 'Required').max(50),
  category: z.string().trim().min(1, 'Required'),
  description: z.string().trim().min(1, 'Required'),
  charge_type: z.enum(['hourly', 'flat']),
  base_hours: z.coerce.number().min(0).optional(),
  flat_fee: z.coerce.number().min(0).optional(),
  uom: z.string().trim().min(1, 'Required'),
  is_active: z.boolean(),
});

export default function BillingRules() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const debouncedSearch = useDebounce(search, 300);

  const rulesQ = useQuery({
    queryKey: ['rules'],
    queryFn: () => rulesApi.list().then((r) => r.data),
  });

  const createM = useMutation({
    mutationFn: (payload) => rulesApi.create(payload),
    onSuccess: () => {
      toast.success('Rule created');
      qc.invalidateQueries({ queryKey: ['rules'] });
      setEditing(null);
    },
    onError: (e) => toast.error(e?.response?.data?.detail || 'Failed'),
  });
  const updateM = useMutation({
    mutationFn: ({ id, patch }) => rulesApi.update(id, patch),
    onSuccess: () => {
      toast.success('Rule updated');
      qc.invalidateQueries({ queryKey: ['rules'] });
      setEditing(null);
    },
    onError: (e) => toast.error(e?.response?.data?.detail || 'Failed'),
  });
  const deleteM = useMutation({
    mutationFn: (id) => rulesApi.remove(id),
    onSuccess: () => {
      toast.success('Rule deleted');
      qc.invalidateQueries({ queryKey: ['rules'] });
      setConfirmDelete(null);
    },
    onError: (e) => toast.error(e?.response?.data?.detail || 'Failed'),
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

  const grouped = filtered.reduce((acc, r) => {
    (acc[r.category] = acc[r.category] || []).push(r);
    return acc;
  }, {});

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-h1 text-slate-900">Billing Rules</h1>
          <p className="text-body text-slate-500 mt-1">
            {items.length} rule{items.length !== 1 && 's'}
          </p>
        </div>
        <Button leftIcon={Plus} onClick={() => setEditing({})}>
          Add Rule
        </Button>
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
          message={search ? 'Try a different search.' : 'Add your first rule.'}
          action={!search && (
            <Button leftIcon={Plus} onClick={() => setEditing({})}>Add Rule</Button>
          )}
        />
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([cat, rules]) => (
            <div key={cat} className="bg-white rounded-lg shadow-card border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <h2 className="text-body font-semibold text-slate-800">
                  {cat} ({rules.length})
                </h2>
              </div>
              <div className="divide-y divide-slate-100">
                {rules.map((r) => (
                  <div key={r.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center px-2 py-0.5 bg-primary-50 text-primary rounded text-small font-mono font-semibold">
                          {r.code}
                        </span>
                        <span className="text-small text-slate-400">v{r.version}</span>
                        {!r.is_active && (
                          <span className="inline-flex items-center px-2 py-0.5 bg-red-50 text-error rounded text-small">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-body text-slate-800 mt-1">{r.description}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1 text-primary font-semibold">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{r.base_hours ?? '—'}</span>
                        <span className="text-small text-slate-500 font-normal">
                          hrs / {r.uom}
                        </span>
                      </div>
                      <button
                        onClick={() => setEditing(r)}
                        className="p-2 rounded-md hover:bg-slate-100 text-slate-600"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(r)}
                        className="p-2 rounded-md hover:bg-red-50 text-slate-400 hover:text-error"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <RuleFormModal
        open={!!editing}
        rule={editing}
        onClose={() => setEditing(null)}
        onSubmit={(data) => {
          if (editing?.id) {
            updateM.mutate({ id: editing.id, patch: data });
          } else {
            createM.mutate(data);
          }
        }}
        loading={createM.isPending || updateM.isPending}
      />

      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => deleteM.mutate(confirmDelete.id)}
        title="Delete rule?"
        message={`Delete rule "${confirmDelete?.code}"? Existing drafts and invoices that reference this rule will keep working — they have the values snapshotted.`}
        confirmText="Delete"
        variant="danger"
        loading={deleteM.isPending}
      />
    </div>
  );
}

function RuleFormModal({ open, rule, onClose, onSubmit, loading }) {
  const isEdit = Boolean(rule?.id);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      code: '', category: '', description: '',
      charge_type: 'hourly', base_hours: 1.0, flat_fee: undefined,
      uom: 'flat', is_active: true,
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        code: rule?.code || '',
        category: rule?.category || '',
        description: rule?.description || '',
        charge_type: rule?.charge_type || 'hourly',
        base_hours: rule?.base_hours ?? 1.0,
        flat_fee: rule?.flat_fee ?? undefined,
        uom: rule?.uom || 'flat',
        is_active: rule?.is_active ?? true,
      });
    }
  }, [open, rule, reset]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Rule' : 'Add Rule'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="rule-form" loading={loading}>
            {isEdit ? 'Save Changes' : 'Add Rule'}
          </Button>
        </>
      }
    >
      <form
        id="rule-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-3"
        noValidate
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Code"
            required
            placeholder="e.g. SITE_VISIT"
            error={errors.code?.message}
            {...register('code')}
          />
          <Input
            label="Category"
            required
            placeholder="e.g. Site"
            error={errors.category?.message}
            {...register('category')}
          />
        </div>
        <Textarea
          label="Description"
          required
          rows={2}
          error={errors.description?.message}
          {...register('description')}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select label="Charge Type" {...register('charge_type')}>
            <option value="hourly">Hourly</option>
            <option value="flat">Flat fee</option>
          </Select>
          <Select label="Unit of Measure" {...register('uom')}>
            <option value="flat">flat</option>
            <option value="per_page">per_page</option>
            <option value="per_line">per_line</option>
            <option value="per_call">per_call</option>
            <option value="per_email">per_email</option>
            <option value="per_building">per_building</option>
          </Select>
          <Input
            label="Base Hours"
            type="number"
            step="0.05"
            error={errors.base_hours?.message}
            {...register('base_hours')}
          />
          <Input
            label="Flat Fee (optional)"
            type="number"
            step="0.01"
            error={errors.flat_fee?.message}
            {...register('flat_fee')}
          />
        </div>
        <label className="flex items-center gap-2 text-body text-slate-700 pt-2">
          <input
            type="checkbox"
            className="rounded border-slate-300"
            {...register('is_active')}
          />
          Active
        </label>
      </form>
    </Modal>
  );
}
