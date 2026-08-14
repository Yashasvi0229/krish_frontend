import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Search,
  ChevronDown,
  ChevronUp,
  Info,
  RotateCw,
  Sparkles,
} from 'lucide-react';
import Button from '../components/common/Button';
import { Input } from '../components/common/Input';
import Breadcrumb from '../components/common/Breadcrumb';
import { claimApi } from '../services/api';

const RECENT_KEY = 'gnc_recent_searches';

/**
 * New-invoice search entry point.
 *
 * User-facing flow (spec §5): type a claim number → click Fetch → we
 * navigate to the processing screen which does the actual work.
 *
 * Under the hood this kicks off a `gmail_sync` job on the backend:
 *   POST /api/jobs/gmail-search  { claim_no: "..." OR file_name: "..." }
 *   → { job_id, status, steps, websocket_url }
 *
 * The processing screen then:
 *   1. Polls / streams that job to COMPLETED (fetches + stores emails).
 *   2. Looks up the resulting claim.
 *   3. Kicks off the AI analysis job.
 *   4. Redirects to /review/{draft_id} when done.
 *
 * Responsive: single-column card, max-w-3xl comfortable at all sizes.
 */
export default function NewInvoiceSearch() {
  const navigate = useNavigate();

  const [searchType, setSearchType] = useState('Claim Number');
  const [query, setQuery] = useState('');
  const [error, setError] = useState(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [excludeKeywords, setExcludeKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    try {
      setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'));
    } catch {
      setRecent([]);
    }
  }, []);

  const persistRecent = (item) => {
    const next = [item, ...recent.filter((r) => r.query !== item.query)].slice(0, 10);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    setRecent(next);
  };

  const runSearch = async (overrides = {}) => {
    const effectiveQuery = (overrides.query ?? query).trim();
    const effectiveType = overrides.searchType ?? searchType;
    if (!effectiveQuery) {
      setError('Enter a claim number or file name to search.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      // Backend accepts either { claim_no } or { file_name } — we send the
      // one the user picked. "Both" is not a backend concept; we default
      // to claim_no if user chose Both, since claim numbers are more precise.
      const payload =
        effectiveType === 'File Name'
          ? { file_name: effectiveQuery }
          : { claim_no: effectiveQuery };

      const { data } = await claimApi.searchGmail(payload);
      const jobId = data.job_id;

      persistRecent({
        query: effectiveQuery,
        searchType: effectiveType,
        timestamp: new Date().toISOString(),
      });
      navigate(`/invoices/new/processing/${jobId}`);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        'Search failed. Please check the claim number and try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') runSearch();
  };

  const reRunRecent = (item) => {
    setQuery(item.query);
    setSearchType(item.searchType || 'Claim Number');
    runSearch({ query: item.query, searchType: item.searchType });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Create New Invoice' },
        ]}
      />

      <div className="mb-6">
        <h1 className="text-h1 text-slate-900">Create New Invoice</h1>
        <p className="text-body text-slate-500 mt-1">
          Enter a claim number or file name to fetch related emails and generate
          an invoice draft
        </p>
      </div>

      {/* Main search card */}
      <div className="bg-white rounded-lg shadow-card border border-slate-200 p-4 sm:p-6">
        {/* Search-type toggle — scrollable on very narrow screens */}
        <div className="mb-4">
          <label className="block text-body font-medium text-slate-700 mb-2">
            Search by
          </label>
          <div className="inline-flex rounded-md border border-slate-300 p-1 bg-slate-50 max-w-full overflow-x-auto">
            {['Claim Number', 'File Name'].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setSearchType(opt)}
                className={`px-4 py-1.5 text-body rounded font-medium transition-colors whitespace-nowrap ${
                  searchType === opt
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <Input
          label={searchType === 'File Name' ? 'File Name' : 'Claim Number'}
          required
          placeholder={
            searchType === 'File Name'
              ? 'e.g., Paradise Holdings'
              : 'e.g., 000-00-055683'
          }
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          error={error}
          leftIcon={Search}
        />

        {/* Advanced options — currently accepts exclude keywords for UI parity;
            we'll wire this to the backend when it accepts the filter. */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="inline-flex items-center gap-1 text-body text-primary hover:underline"
          >
            {advancedOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            Advanced Options
          </button>

          {advancedOpen && (
            <div className="mt-3 border border-slate-200 rounded-md p-4 space-y-3 bg-slate-50">
              <Input
                label="Exclude emails containing these words"
                placeholder="e.g. draft, internal, budget"
                hint="Comma-separated. Applied after fetch."
                value={excludeKeywords}
                onChange={(e) => setExcludeKeywords(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* What-happens-next panel */}
        <div className="mt-5 rounded-md bg-primary-50 border border-primary-100 p-4 flex gap-3">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-body text-slate-700">
            <p className="font-medium mb-1">What happens next:</p>
            <p>
              We'll search your connected Gmail for matching emails, download
              and OCR every attachment, and run our AI analysis to generate a
              draft invoice for review.{' '}
              <span className="italic">Typically 1–3 minutes.</span>
            </p>
          </div>
        </div>

        {/* Actions — stack on very narrow screens */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
          <Button
            variant="secondary"
            onClick={() => navigate('/dashboard')}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            leftIcon={Sparkles}
            onClick={() => runSearch()}
            loading={loading}
            size="lg"
          >
            {loading ? 'Initiating…' : 'Fetch Emails & Analyze'}
          </Button>
        </div>
      </div>

      {/* Recent searches */}
      {recent.length > 0 && (
        <div className="mt-6">
          <h2 className="text-h3 text-slate-800 mb-3">Recent Searches</h2>
          <div className="flex flex-wrap gap-2">
            {recent.slice(0, 5).map((r, i) => (
              <button
                key={i}
                onClick={() => reRunRecent(r)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-body text-slate-700 hover:border-primary hover:text-primary transition-colors"
              >
                <span className="font-medium">{r.query}</span>
                <span className="text-small text-slate-400 hidden sm:inline">
                  {new Date(r.timestamp).toLocaleDateString()}
                </span>
                <RotateCw className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
