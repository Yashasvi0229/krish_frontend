import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  Search, Building2, Mail, Phone, MapPin, Plus, Edit2, Trash2,
} from 'lucide-react';
import Button from '../components/common/Button';
import { Input, Select } from '../components/common/Input';
import EmptyState from '../components/common/EmptyState';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import Modal from '../components/common/Modal';
import ConfirmModal from '../components/common/ConfirmModal';
import useDebounce from '../hooks/useDebounce';
import { clientApi } from '../services/api';

/**
 * Client Master — full CRUD.
 *
 * Endpoints used (from backend):
 *   GET    /api/clients          → list
 *   POST   /api/clients          → create
 *   PATCH  /api/clients/{id}     → update
 *   DELETE /api/clients/{id}     → soft delete
 *
 * Responsive:
 *   * Desktop: name + contact + rate + actions in one row.
 *   * Mobile:  stacked block per client, actions at bottom.
 *   * Modal:   single-column form on <sm, two-column on ≥sm.
 */
const schema = z.object({
  name: z.string().trim().min(1, 'Required'),
  company_legal_name: z.string().trim().min(1, 'Required'),
  client_type: z.enum(['Insurance', 'Adjuster', 'Contractor', 'Other']),
  primary_contact_name: z.string().trim().min(1, 'Required'),
  email: z.string().trim().email('Valid email required'),
  phone: z.string().trim().min(1, 'Required'),
  address_line1: z.string().trim().min(1, 'Required'),
  address_line2: z.string().optional(),
  hourly_rate: z.coerce.number().min(0),
  currency: z.string().length(3),
  gst_percent: z.coerce.number().min(0).max(100),
  invoice_prefix: z.string().max(20).optional(),
});

export default function ClientMaster() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);   // null | {} for new | client for edit
  const [confirmDelete, setConfirmDelete] = useState(null);
  const debouncedSearch = useDebounce(search, 300);

  const clientsQ = useQuery({
    queryKey: ['clients-all'],
    queryFn: () => clientApi.list().then((r) => r.data),
  });

  const createM = useMutation({
    mutationFn: (payload) => clientApi.create(payload),
    onSuccess: () => {
      toast.success('Client added');
      qc.invalidateQueries({ queryKey: ['clients-all'] });
      setEditing(null);
    },
    onError: (e) => toast.error(e?.response?.data?.detail || 'Failed to add'),
  });

  const updateM = useMutation({
    mutationFn: ({ id, patch }) => clientApi.update(id, patch),
    onSuccess: () => {
      toast.success('Client updated');
      qc.invalidateQueries({ queryKey: ['clients-all'] });
      setEditing(null);
    },
    onError: (e) => toast.error(e?.response?.data?.detail || 'Failed to update'),
  });

  const deleteM = useMutation({
    mutationFn: (id) => clientApi.remove(id),
    onSuccess: () => {
      toast.success('Client deleted');
      qc.invalidateQueries({ queryKey: ['clients-all'] });
      setConfirmDelete(null);
    },
    onError: (e) => toast.error(e?.response?.data?.detail || 'Failed to delete'),
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-h1 text-slate-900">Clients</h1>
          <p className="text-body text-slate-500 mt-1">
            {items.length} client{items.length !== 1 && 's'}
          </p>
        </div>
        <Button
          leftIcon={Plus}
          onClick={() => setEditing({})}
          className="w-full sm:w-auto"
        >
          Add Client
        </Button>
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
            title="No clients"
            message={search ? 'No matches for your search.' : 'Add your first client to get started.'}
            action={!search && (
              <Button leftIcon={Plus} onClick={() => setEditing({})}>Add Client</Button>
            )}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((c) => (
              <div key={c.id} className="p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary-50 text-primary flex items-center justify-center font-semibold shrink-0">
                        {(c.name || 'C').charAt(0).toUpperCase()}
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
                      <Tag className="bg-slate-100 text-slate-700">{c.client_type}</Tag>
                      <Tag className="bg-primary-50 text-primary">
                        ${c.hourly_rate}/hr {c.currency}
                      </Tag>
                      {c.gst_percent > 0 && (
                        <Tag className="bg-slate-100 text-slate-700">
                          GST {c.gst_percent}%
                        </Tag>
                      )}
                      {!c.is_active && <Tag className="bg-red-50 text-error">Inactive</Tag>}
                    </div>
                  </div>

                  <div className="flex gap-1 shrink-0 self-end lg:self-start">
                    <button
                      onClick={() => setEditing(c)}
                      className="p-2 rounded-md hover:bg-slate-100 text-slate-600"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(c)}
                      className="p-2 rounded-md hover:bg-red-50 text-slate-400 hover:text-error"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ClientFormModal
        open={!!editing}
        client={editing}
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
        title="Delete client?"
        message={`Delete "${confirmDelete?.name}"? Existing invoices for this client stay untouched — this soft-deletes the client record.`}
        confirmText="Delete"
        variant="danger"
        loading={deleteM.isPending}
      />
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

function Tag({ className, children }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 ${className}`}>
      {children}
    </span>
  );
}

function ClientFormModal({ open, client, onClose, onSubmit, loading }) {
  const isEdit = Boolean(client?.id);
  const {
    register, handleSubmit, reset, formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '', company_legal_name: '', client_type: 'Adjuster',
      primary_contact_name: '', email: '', phone: '',
      address_line1: '', address_line2: '',
      hourly_rate: 150, currency: 'CAD', gst_percent: 0,
      invoice_prefix: '',
    },
  });

  // Reset form when opened / target client changes
  React.useEffect(() => {
    if (open) {
      reset({
        name: client?.name || '',
        company_legal_name: client?.company_legal_name || '',
        client_type: client?.client_type || 'Adjuster',
        primary_contact_name: client?.primary_contact_name || '',
        email: client?.email || '',
        phone: client?.phone || '',
        address_line1: client?.address_line1 || '',
        address_line2: client?.address_line2 || '',
        hourly_rate: client?.hourly_rate ?? 150,
        currency: client?.currency || 'CAD',
        gst_percent: client?.gst_percent ?? 0,
        invoice_prefix: client?.invoice_prefix || '',
      });
    }
  }, [open, client, reset]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Client' : 'Add Client'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            form="client-form"
            loading={loading}
          >
            {isEdit ? 'Save Changes' : 'Add Client'}
          </Button>
        </>
      }
    >
      <form
        id="client-form"
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        noValidate
      >
        <Input label="Display Name" required error={errors.name?.message} {...register('name')} />
        <Input label="Legal Name" required error={errors.company_legal_name?.message} {...register('company_legal_name')} />
        <Select label="Type" {...register('client_type')}>
          <option>Insurance</option>
          <option>Adjuster</option>
          <option>Contractor</option>
          <option>Other</option>
        </Select>
        <Input label="Primary Contact" required error={errors.primary_contact_name?.message} {...register('primary_contact_name')} />
        <Input label="Email" required error={errors.email?.message} {...register('email')} />
        <Input label="Phone" required error={errors.phone?.message} {...register('phone')} />
        <Input label="Address Line 1" required className="sm:col-span-2" error={errors.address_line1?.message} {...register('address_line1')} />
        <Input label="Address Line 2" className="sm:col-span-2" {...register('address_line2')} />
        <Input label="Hourly Rate" type="number" step="0.01" required error={errors.hourly_rate?.message} {...register('hourly_rate')} />
        <Select label="Currency" {...register('currency')}>
          <option>CAD</option>
          <option>USD</option>
          <option>INR</option>
        </Select>
        <Input label="GST %" type="number" step="0.1" error={errors.gst_percent?.message} {...register('gst_percent')} />
        <Input label="Invoice Prefix" placeholder="INV" {...register('invoice_prefix')} />
      </form>
    </Modal>
  );
}
