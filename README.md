# GNC Invoice Automation — Frontend

React + Tailwind CSS implementation of all 10 screens defined in
`GNC_Invoice_Automation_Frontend_Screen_Specification.docx`.
Every screen, action, state, and API endpoint listed in the spec is wired up
in this codebase.

## Tech Stack

Matches spec sections 2.1 and 13.2:

- **React 18** with Vite
- **Tailwind CSS** with the design system from spec 2.1 (primary `#1F4E79`, Inter, 4/8-px grid)
- **react-router-dom** for routing
- **@tanstack/react-query** for API data fetching & caching
- **zustand** for global auth state
- **axios** for HTTP
- **react-hook-form + zod** for form validation
- **@dnd-kit** for drag-and-drop line items (spec 7.8)
- **react-hot-toast** for notifications
- **date-fns** for dates
- **lucide-react** for icons
- **clsx** for conditional classNames

No paid or non-obvious defaults were assumed; component library is bespoke Tailwind
components (no shadcn/MUI/Antd runtime), matching the "recommended" (not required)
note in spec 2.1.

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build → dist/
npm run preview   # preview production build
npm run lint      # ESLint check
```

The Vite dev server proxies `/api` to `http://localhost:8000` (FastAPI) — change in
`vite.config.js` if your backend runs elsewhere.

## Folder structure (per spec 13.1)

```
src/
├── components/
│   ├── common/          Button, Input, Modal, StatusPill, ConfirmModal, EmptyState,
│   │                    LoadingSkeleton, Breadcrumb, DateRangePicker, DropdownMenu,
│   │                    Pagination, Toggle, PageLoader
│   ├── layout/          TopNav (spec 2.2), AppLayout, ProtectedRoute
│   └── invoice/         EmailCard, LineItemsTable, TotalsBox
├── pages/
│   ├── Login.jsx                Screen 1 — /login
│   ├── Dashboard.jsx            Screen 2 — /dashboard
│   ├── NewInvoiceSearch.jsx     Screen 3 — /invoices/new
│   ├── ProcessingLoader.jsx     Screen 4 — /invoices/new/processing/:jobId
│   ├── ReviewScreen.jsx         Screen 5 — /invoices/review/:draftId  (split view)
│   ├── InvoicePreview.jsx       Screen 6 — /invoices/:id/preview
│   ├── InvoiceHistory.jsx       Screen 7 — /invoices
│   ├── ClientMaster.jsx         Screen 8 — /clients            (Admin)
│   ├── BillingRules.jsx         Screen 9 — /rules              (Admin)
│   └── Settings.jsx             Screen 10 — /settings
├── hooks/               useAuth, useDebounce, useAutoSave
├── services/            api.js — axios instance + all endpoints
├── store/               authStore.js — zustand
└── utils/               formatters.js, validators.js
```

## Design system (spec 2.1)

Colours (`tailwind.config.js`):

- `primary` = `#1F4E79`
- `accent`, `success`, `warning`, `error`, `flagged`, `processing`, `draft`

Typography:

- `text-h1` 24 px, `text-h2` 20 px, `text-h3` 18 px, `text-body` 14 px, `text-small` 12 px

Spacing: 4 px / 8 px grid via default Tailwind.

## Backend API contract expected

All endpoints called by the frontend are documented in `src/services/api.js`.
Summary:

| Endpoint | Method | Screen |
|---|---|---|
| `/api/auth/google` | POST | 1 |
| `/api/auth/signout` | POST | Top nav |
| `/api/auth/reconnect-gmail` | POST | 10 |
| `/api/auth/disconnect-gmail` | POST | 10 |
| `/api/dashboard/stats` | GET | 2 |
| `/api/invoices` | GET | 2, 7 |
| `/api/invoices/search` | POST | 3 |
| `/api/invoices/:id` | GET | 6 |
| `/api/invoices/:id/download` | GET (blob) | 2, 6, 7 |
| `/api/invoices/:id/email` | POST | 6 |
| `/api/invoices/:id/duplicate` | POST | 2, 6, 7 |
| `/api/invoices/:id` | DELETE | 2, 7 |
| `/api/invoices/bulk-download` | POST (blob) | 7 |
| `/api/invoices/export` | GET (blob) | 7 |
| `/api/jobs/:jobId` | GET | 4 |
| `/api/jobs/:jobId/cancel` | POST | 4 |
| `/api/jobs/:jobId/ws` | WebSocket | 4 |
| `/api/drafts/:draftId` | GET | 5 |
| `/api/drafts/:draftId` | PATCH | 5 (auto-save) |
| `/api/drafts/:draftId/approve` | POST | 5 |
| `/api/drafts/:draftId/reject` | POST | 5 |
| `/api/clients` | GET/POST | 2, 3, 7, 8 |
| `/api/clients/:id` | GET/PATCH/DELETE | 8 |
| `/api/clients/:id/template` | POST (multipart) | 8 |
| `/api/rules` | GET/POST | 5, 7, 9 |
| `/api/rules/:id` | PATCH/DELETE | 9 |
| `/api/rules/:id/history` | GET | 9 |
| `/api/rules/:id/revert` | POST | 9 |
| `/api/rules/import` | POST (multipart) | 9 |
| `/api/users/me` | GET/PATCH | 10 |
| `/api/users/me/sessions` | GET | 10 |
| `/api/users/me/sessions/revoke-all` | POST | 10 |
| `/api/users/me/notifications` | PATCH | 10 |
| `/api/users/me/preferences` | PATCH | 10 |

## Screen ↔ Spec mapping

Every screen file starts with a JSDoc block that names the spec section it
implements. Cross-references (`spec 4.5`, `spec 7.8`) are inlined at each
implementation point so it is obvious what maps to what.

## Notes

- **Google OAuth**: the frontend hands off `id_token` to `/api/auth/google` (spec
  3.5). The actual GIS SDK integration is stubbed in `src/pages/Login.jsx` with
  a placeholder token — swap in `google.accounts.oauth2.initTokenClient` once
  the OAuth client ID is available.
- **WebSocket / polling**: `ProcessingLoader.jsx` tries WebSocket first, falls
  back to 2-second polling (spec 6.5). Both hit the same job shape.
- **Auto-save**: `ReviewScreen.jsx` PATCHes the draft after 1 s of idle time
  (spec 7.8) via `useAutoSave`.
- **Admin gating**: `/clients` and `/rules` check `user.role === 'Admin'` and
  redirect otherwise. Nav links hide the same way for non-admin.
- **Filter state persistence**: `InvoiceHistory.jsx` serialises filters to URL
  query params (spec 9.4).
- **Accessibility** (spec 13.4): keyboard focus rings, semantic labels, ARIA
  attributes on modals, dialogs, toggles.
- **Performance** (spec 13.5): lazy-loaded routes, debounced search inputs
  (300 ms), debounced auto-save (1 s).
