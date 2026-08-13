import React from 'react';
import { Outlet } from 'react-router-dom';
import TopNav from './TopNav';

/**
 * Common layout wrapper for authenticated routes.
 * TopNav is fixed at 64px height (spec 2.2), main content offsets by pt-16.
 */
export default function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav />
      <main className="pt-16">
        <Outlet />
      </main>
    </div>
  );
}
