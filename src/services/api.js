import axios from 'axios';
import toast from 'react-hot-toast';

/**
 * Axios instance for all backend calls.
 *
 * We use the direct backend URL in production (Render Static Sites don't
 * reliably proxy POST bodies via _redirects). CORS is enabled on the
 * backend to allow the frontend origin.
 *
 * Dev: Vite proxy at /api → http://localhost:8000 (see vite.config.js).
 */
const BACKEND_HOST = import.meta.env.VITE_BACKEND_HOST || '';
const api = axios.create({
  baseURL: BACKEND_HOST ? `${BACKEND_HOST}/api` : '/api',
  timeout: 60_000,   // AI jobs can take ~60s; keep generous
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gnc_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      localStorage.removeItem('gnc_access_token');
      localStorage.removeItem('gnc_user');
      if (window.location.pathname !== '/login') {
        toast.error('Session expired. Please sign in again.');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// Auth
// ============================================================================
// Backend uses email/password (not Google OAuth). Login returns:
//   { access_token, token_type: 'bearer', expires_in, user: {email, name, role} }
export const authApi = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get('/users/me'),
  signOut: () => api.post('/auth/signout'),
};

// ============================================================================
// Gmail — starts OAuth flow; user visits returned URL then completes
// ============================================================================
export const gmailApi = {
  status: () => api.get('/gmail/status'),
  connect: () => api.post('/gmail/connect'),   // returns { auth_url }
  disconnect: () => api.post('/gmail/disconnect'),
};

// ============================================================================
// Dashboard
// ============================================================================
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
};

// ============================================================================
// Rules & Clients — read-only in current backend; CRUD wired but returns 404
// until we build those endpoints. Frontend handles gracefully.
// ============================================================================
export const rulesApi = {
  list: () => api.get('/rules'),
  create: (payload) => api.post('/rules', payload),
  update: (id, patch) => api.patch(`/rules/${id}`, patch),
  remove: (id) => api.delete(`/rules/${id}`),
};

export const clientApi = {
  list: (params) => api.get('/clients', { params }),
  get: (id) => api.get(`/clients/${id}`),
  create: (payload) => api.post('/clients', payload),
  update: (id, patch) => api.patch(`/clients/${id}`, patch),
  remove: (id) => api.delete(`/clients/${id}`),
};

// ============================================================================
// Jobs — Gmail search + AI analysis flow
// ============================================================================
// Two kinds of jobs:
//   * gmail_sync   — fetches emails + attachments for a claim
//   * claim_analysis — runs AI + creates draft
// Both are polled via GET /jobs/{id} or streamed via WebSocket.
export const jobApi = {
  get: (jobId) => api.get(`/jobs/${jobId}`),
  wsUrl: (jobId) => {
    // WebSocket goes directly to the backend — Render static sites don't
    // proxy WebSockets. In dev the Vite proxy handles it via same-origin.
    // The polling fallback in ProcessingLoader keeps this robust: if WS
    // fails (e.g. because the backend is on a different origin and CORS
    // blocks it), we just poll GET /jobs/{id}.
    const backendHost = import.meta.env.VITE_BACKEND_HOST;
    if (backendHost) {
      const proto = backendHost.startsWith('https') ? 'wss' : 'ws';
      const host = backendHost.replace(/^https?:\/\//, '');
      return `${proto}://${host}/api/jobs/${jobId}/ws`;
    }
    // Fallback: same origin (dev + local)
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${window.location.host}/api/jobs/${jobId}/ws`;
  },
};

// ============================================================================
// Claims — search Gmail then trigger AI analysis
// ============================================================================
// Flow the frontend runs:
//   1. POST /jobs/gmail-search  { claim_no OR file_name }   → job_id
//   2. Poll /jobs/{job_id} until COMPLETED (this stores emails+attachments,
//      creates the Claim row, and puts claim_id in job.result_data).
//   3. POST /claims/{claim_id}/analyze  → job_id for analysis
//   4. Poll analysis job → result.draft_id
export const claimApi = {
  searchGmail: (payload) => api.post('/jobs/gmail-search', payload),
  analyze: (claimId, payload) =>
    api.post(`/claims/${claimId}/analyze`, payload || { force_refresh: false }),
  getAnalyses: (claimId) => api.get(`/claims/${claimId}/analyses`),
  listDrafts: (claimId) => api.get(`/claims/${claimId}/drafts`),
  listInvoices: (claimId) => api.get(`/claims/${claimId}/invoices`),
};

// ============================================================================
// Drafts — per-line CRUD + workflow
// ============================================================================
// Backend uses PATCH/POST/DELETE PER LINE (not bulk PATCH of whole draft).
// Every edit auto-recomputes totals AND appends to approval_history.
export const draftApi = {
  get: (draftId) => api.get(`/drafts/${draftId}`),
  history: (draftId) => api.get(`/drafts/${draftId}/history`),

  // Line item CRUD
  editLine: (draftId, lineNumber, patch) =>
    api.patch(`/drafts/${draftId}/line-items/${lineNumber}`, patch),
  addLine: (draftId, payload) =>
    api.post(`/drafts/${draftId}/line-items`, payload),
  deleteLine: (draftId, lineNumber, payload) =>
    api.delete(`/drafts/${draftId}/line-items/${lineNumber}`, { data: payload }),
  restoreLine: (draftId, lineNumber) =>
    api.post(`/drafts/${draftId}/line-items/${lineNumber}/restore`),

  // Workflow (multi-stage: DRAFT → PENDING_PM → HOUR_VERIFY → RS → APPROVED)
  submitForReview: (draftId, payload) =>
    api.post(`/drafts/${draftId}/submit-for-review`, payload || {}),
  advance: (draftId, payload) =>
    api.post(`/drafts/${draftId}/advance`, payload || {}),
  reject: (draftId, payload) =>
    api.post(`/drafts/${draftId}/reject`, payload),
  reopen: (draftId) => api.post(`/drafts/${draftId}/reopen`),

  // Legacy single-step approve — bypasses multi-stage; still works if the
  // client doesn't use PM/RS review roles.
  approve: (draftId, payload) =>
    api.post(`/drafts/${draftId}/approve`, payload || {}),
};

// ============================================================================
// Invoices — listing + detail + download
// ============================================================================
// Missing endpoints (email/duplicate/delete/bulk-download/export) will be
// added in a later phase; frontend hides those UI actions for now.
export const invoiceApi = {
  list: (params) => api.get('/invoices', { params }),
  get: (id) => api.get(`/invoices/${id}`),
  download: (id) =>
    api.get(`/invoices/${id}/download`, { responseType: 'blob' }),
  cancel: (id, payload) =>
    api.delete(`/invoices/${id}`, { data: payload || {} }),
  duplicate: (id, payload) =>
    api.post(`/invoices/${id}/duplicate`, payload || {}),
};

// ============================================================================
// Emails & attachments (used by ReviewScreen for source-data inspection)
// ============================================================================
export const emailApi = {
  get: (id) => api.get(`/emails/${id}`),
  listForClaim: (claimId) => api.get(`/claims/${claimId}/emails`),
};

export const attachmentApi = {
  // Absolute URL so callers can hit it directly with fetch() (used by
  // EmailCard for authenticated blob download without axios interceptors).
  downloadUrl: (id) => {
    const host = import.meta.env.VITE_BACKEND_HOST || '';
    return `${host}/api/attachments/${id}/download`;
  },
};

export default api;
