import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Check,
  Loader2,
  Mail,
  Brain,
  Calculator,
  FileSpreadsheet,
  X,
  AlertCircle,
} from 'lucide-react';
import Button from '../components/common/Button';
import { claimApi, jobApi } from '../services/api';
import { formatCurrencyPrefixed } from '../utils/formatters';

/**
 * Two-phase job runner.
 *
 * Phase A — Gmail sync
 *   Started by NewInvoiceSearch. When it completes we automatically kick
 *   off Phase B on the resulting claim.
 *
 * Phase B — AI analysis
 *   Runs the billing engine and creates the InvoiceDraft. When done we
 *   redirect to the review screen.
 *
 * The screen looks like one continuous process to the user, but under
 * the hood two separate ProcessingJob rows exist. We store the current
 * job id in `activeJobId` and swap it when A → B.
 *
 * Real-time updates come from a WebSocket; if that drops or fails, we
 * fall back to polling every 2 seconds.
 *
 * Responsive: single-column max-w-2xl card. Progress ring shrinks a
 * touch on <sm screens. Cancel button stays visible at the bottom.
 */

// Phase A steps mirror what the backend's gmail_sync worker publishes.
// Phase B steps come from the analyze worker. We display both timelines
// end-to-end so the user sees the whole story.
const PHASE_A_STEPS = [
  { key: 'connecting', label: 'Connecting to Gmail', icon: Mail },
  { key: 'fetching_emails', label: 'Fetching emails', icon: Mail },
  { key: 'processing_attachments', label: 'Downloading attachments', icon: FileSpreadsheet },
  { key: 'extracting_text', label: 'Extracting text (OCR)', icon: FileSpreadsheet },
];
const PHASE_B_STEPS = [
  { key: 'ai_analysis', label: 'AI analysis', icon: Brain },
  { key: 'billing_rules', label: 'Applying billing rules', icon: Calculator },
  { key: 'generating_invoice', label: 'Generating draft invoice', icon: FileSpreadsheet },
];
const ALL_STEPS = [...PHASE_A_STEPS, ...PHASE_B_STEPS];

export default function ProcessingLoader() {
  const { jobId: initialJobId } = useParams();
  // Force-refresh comes from the search page as ?force_refresh=true.
  // Persisted in the URL so a page refresh mid-processing preserves it.
  const [searchParams] = useSearchParams();
  const forceRefresh = searchParams.get('force_refresh') === 'true';
  const navigate = useNavigate();

  // We track BOTH phases in one flat state object.
  const [phase, setPhase] = useState('A');
  const [activeJobId, setActiveJobId] = useState(initialJobId);
  const [job, setJob] = useState(null);
  const [claimId, setClaimId] = useState(null);
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const pollRef = useRef(null);

  // Warn user before closing tab mid-process
  useEffect(() => {
    const handler = (e) => {
      if (job?.status === 'PROCESSING' || job?.status === 'PENDING') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [job?.status]);

  // ---- Single effect that tracks the active job (whichever phase) ----
  useEffect(() => {
    if (!activeJobId) return;

    let cancelled = false;

    const cleanup = () => {
      try {
        wsRef.current?.close();
      } catch (_e) {
        /* already closed */
      }
      wsRef.current = null;
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };

    const onJobUpdate = async (data) => {
      if (cancelled) return;
      setJob(data);

      if (data.status === 'COMPLETED') {
        cleanup();

        if (phase === 'A') {
          // Gmail sync finished — the worker stored the claim_id in the job's
          // result_data. Read it directly instead of hitting a lookup endpoint
          // (which may not exist on the current backend).
          try {
            const cid = data.result_data?.claim_id;
            if (!cid) {
              throw new Error(
                'Backend did not include claim_id in job result. Please contact support.'
              );
            }
            setClaimId(cid);

            const { data: analyzeJob } = await claimApi.analyze(cid, {
              force_refresh: forceRefresh,
            });
            setPhase('B');
            setJob(null);
            setActiveJobId(analyzeJob.job_id);
          } catch (err) {
            setError(
              err?.response?.data?.detail ||
                err?.message ||
                'Failed to start AI analysis.'
            );
          }
          return;
        }

        // Phase B done → go to review
        const draftId = data.result_data?.draft_id;
        if (!draftId) {
          setError('Analysis completed but no draft was produced.');
          return;
        }
        setTimeout(() => {
          navigate(`/invoices/review/${draftId}`, { replace: true });
        }, 800);
      }

      if (data.status === 'FAILED' || data.status === 'CANCELLED') {
        cleanup();
        setError(data.error_message || 'Processing failed.');
      }
    };

    // Try WebSocket first — falls through to polling if it fails.
    try {
      const ws = new WebSocket(jobApi.wsUrl(activeJobId));
      wsRef.current = ws;
      ws.onmessage = (e) => {
        try {
          onJobUpdate(JSON.parse(e.data));
        } catch {
          /* ignore malformed frames */
        }
      };
      ws.onerror = () => {
        try {
          ws.close();
        } catch (_e) {
          /* already closed */
        }
        startPolling();
      };
    } catch {
      startPolling();
    }

    function startPolling() {
      pollRef.current = setInterval(async () => {
        try {
          const res = await jobApi.get(activeJobId);
          onJobUpdate(res.data);
        } catch (_err) {
          /* silent — will retry next tick */
        }
      }, 2000);
    }

    // Fire one immediate GET so the UI doesn't sit at 0% before the first
    // WS frame arrives.
    jobApi
      .get(activeJobId)
      .then((r) => onJobUpdate(r.data))
      .catch(() => {});

    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeJobId]);

  // Map backend job step_index → our combined timeline position.
  const remoteStepIdx = job?.current_step_index ?? -1;
  const globalIdx =
    phase === 'A'
      ? Math.min(remoteStepIdx, PHASE_A_STEPS.length - 1)
      : PHASE_A_STEPS.length + Math.min(remoteStepIdx, PHASE_B_STEPS.length - 1);

  const totalSteps = ALL_STEPS.length;
  const combinedProgress =
    error
      ? Math.round((globalIdx / totalSteps) * 100)
      : Math.round(
          ((phase === 'A' ? 0 : PHASE_A_STEPS.length) +
            (job?.progress ?? 0) / 100 *
              (phase === 'A' ? PHASE_A_STEPS.length : PHASE_B_STEPS.length)) /
            totalSteps *
            100
        );

  const steps = ALL_STEPS.map((def, i) => {
    let status;
    if (error && i === globalIdx) status = 'failed';
    else if (i < globalIdx) status = 'complete';
    else if (i === globalIdx && (job?.status === 'PROCESSING' || job?.status === 'PENDING')) status = 'active';
    else if (i === globalIdx && job?.status === 'COMPLETED') status = 'complete';
    else status = 'pending';
    return { ...def, status };
  });

  const stats = job?.stats || {};

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-h1 text-slate-900">Processing Your Request</h1>
        <p className="text-body text-slate-500 mt-1">
          Please wait while we fetch and analyze your claim data
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-card border border-slate-200 p-4 sm:p-8">
        <div className="flex justify-center mb-6">
          <CircularProgress percent={combinedProgress} />
        </div>

        <div className="space-y-3">
          {steps.map((step, i) => (
            <StepRow key={step.key} step={step} isLast={i === steps.length - 1} />
          ))}
        </div>

        {/* Live stats */}
        {(stats.emails_analyzed || stats.emails_found || stats.attachments_analyzed || stats.billable_lines) && (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-slate-200">
            <StatMini
              label="Emails"
              value={stats.emails_analyzed ?? stats.emails_found ?? 0}
            />
            <StatMini
              label="Attachments"
              value={stats.attachments_analyzed ?? stats.attachments_downloaded ?? 0}
            />
            <StatMini
              label="Billable Lines"
              value={stats.billable_lines ?? 0}
            />
            <StatMini
              label="AI Cost"
              value={formatCurrencyPrefixed(stats.total_cost_usd ?? 0, 'USD')}
            />
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-md bg-red-50 border border-error/20 p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-error shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-body font-medium text-error">
                Processing failed
              </p>
              <p className="text-small text-slate-600 mt-0.5 break-words">
                {error}
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => navigate('/invoices/new')}
                >
                  Start over
                </Button>
                <Button size="sm" onClick={() => window.location.reload()}>
                  Retry
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {!error && (job?.status === 'PROCESSING' || job?.status === 'PENDING' || !job) && (
        <div className="mt-4 text-center">
          <button
            onClick={() => {
              if (confirm('Cancel processing? Any progress will be lost.')) {
                navigate('/invoices/new', { replace: true });
              }
            }}
            className="text-body text-error hover:underline font-medium"
          >
            Cancel Processing
          </button>
        </div>
      )}
    </div>
  );
}

function CircularProgress({ percent }) {
  const size = typeof window !== 'undefined' && window.innerWidth < 640 ? 120 : 140;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          stroke="#E2E8F0"
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          stroke="#1F4E79"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-h1 text-primary font-bold">{percent}%</span>
      </div>
    </div>
  );
}

function StepRow({ step, isLast }) {
  const iconMap = {
    complete: (
      <div className="h-8 w-8 rounded-full bg-success flex items-center justify-center text-white">
        <Check className="h-4 w-4" />
      </div>
    ),
    active: (
      <div className="h-8 w-8 rounded-full bg-primary-50 flex items-center justify-center text-primary">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    ),
    pending: (
      <div className="h-8 w-8 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-300">
        <step.icon className="h-4 w-4" />
      </div>
    ),
    failed: (
      <div className="h-8 w-8 rounded-full bg-error flex items-center justify-center text-white">
        <X className="h-4 w-4" />
      </div>
    ),
  };
  const textClass = {
    complete: 'text-slate-500',
    active: 'text-primary font-semibold',
    pending: 'text-slate-400',
    failed: 'text-error font-semibold',
  }[step.status];

  return (
    <div className="flex items-start gap-3 relative">
      {!isLast && (
        <span className="absolute left-4 top-8 bottom-0 w-px bg-slate-200" />
      )}
      <div className="relative z-10">{iconMap[step.status]}</div>
      <div className="flex-1 pt-1">
        <p className={`text-body ${textClass}`}>{step.label}</p>
      </div>
    </div>
  );
}

function StatMini({ label, value }) {
  return (
    <div>
      <p className="text-small text-slate-500">{label}</p>
      <p className="text-body font-semibold text-slate-900 mt-0.5">{value}</p>
    </div>
  );
}
