import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import PageLoader from './components/common/PageLoader';

// Per spec 13.5 — lazy load routes with React.lazy()
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const NewInvoiceSearch = lazy(() => import('./pages/NewInvoiceSearch'));
const ProcessingLoader = lazy(() => import('./pages/ProcessingLoader'));
const ReviewScreen = lazy(() => import('./pages/ReviewScreen'));
const InvoicePreview = lazy(() => import('./pages/InvoicePreview'));
const InvoiceHistory = lazy(() => import('./pages/InvoiceHistory'));
const ClientMaster = lazy(() => import('./pages/ClientMaster'));
const BillingRules = lazy(() => import('./pages/BillingRules'));
const Settings = lazy(() => import('./pages/Settings'));

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Screen 1 — Login (public) */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes with common layout (TopNav) */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* Screen 2 — Dashboard */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Screen 3 — New Invoice Search */}
          <Route path="/invoices/new" element={<NewInvoiceSearch />} />

          {/* Screen 4 — Processing Loader */}
          <Route
            path="/invoices/new/processing/:jobId"
            element={<ProcessingLoader />}
          />

          {/* Screen 5 — Review Screen */}
          <Route
            path="/invoices/review/:draftId"
            element={<ReviewScreen />}
          />

          {/* Screen 6 — Invoice Preview */}
          <Route path="/invoices/:id/preview" element={<InvoicePreview />} />

          {/* Screen 7 — Invoice History */}
          <Route path="/invoices" element={<InvoiceHistory />} />

          {/* Screen 8 — Client Master (Admin) */}
          <Route path="/clients" element={<ClientMaster />} />

          {/* Screen 9 — Billing Rules (Admin) */}
          <Route path="/rules" element={<BillingRules />} />

          {/* Screen 10 — Settings / Profile */}
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
