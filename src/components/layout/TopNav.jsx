import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  User,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import useAuth from '../../hooks/useAuth';
import { authApi } from '../../services/api';
import Logo from '../common/Logo';

/**
 * TopNav — fixed 64px, three regions.
 *
 * Desktop (≥md):
 *   Left: logo + name
 *   Center: nav links (Dashboard, Invoices, Clients, Rules, Settings)
 *   Right: bell + user avatar with dropdown
 *
 * Mobile (<md):
 *   Left: logo (compact) + hamburger
 *   Right: user avatar dropdown
 *   The nav links appear in a full-width dropdown drawer under the bar
 *   when the hamburger is tapped. Auto-closes on navigation.
 */
export default function TopNav() {
  const { user, isAdmin, clearSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const menuRef = useRef();

  // Close menus on outside click
  useEffect(() => {
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Auto-close mobile drawer on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    try {
      await authApi.signOut();
    } catch {
      /* clear locally anyway */
    }
    clearSession();
    navigate('/login', { replace: true });
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/invoices', label: 'Invoices' },
    ...(isAdmin
      ? [
          { to: '/clients', label: 'Clients' },
          { to: '/rules', label: 'Rules' },
        ]
      : []),
    { to: '/settings', label: 'Settings' },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-40">
        <div className="h-full max-w-[1440px] mx-auto flex items-center px-3 sm:px-6 gap-2">
          {/* Hamburger (mobile only) */}
          <button
            className="md:hidden p-2 rounded-md hover:bg-slate-100 text-slate-600 shrink-0"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-label="Menu"
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
            <Logo size="md" />
            <span className="text-body font-semibold text-slate-900 hidden sm:inline">
              GNC Invoice Automation
            </span>
            <span className="text-body font-semibold text-slate-900 sm:hidden">
              GNC
            </span>
          </Link>

          {/* Desktop center nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/dashboard'}
                className={({ isActive }) =>
                  clsx(
                    'relative px-4 py-2 text-body font-medium transition-colors',
                    isActive
                      ? 'text-primary'
                      : 'text-slate-600 hover:text-slate-900'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {item.label}
                    {isActive && (
                      <span className="absolute -bottom-3 left-2 right-2 h-0.5 bg-primary rounded" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Spacer on mobile (nav is in drawer, not header) */}
          <div className="md:hidden flex-1" />

          {/* Right side */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              className="p-2 rounded-md hover:bg-slate-100 text-slate-600 relative"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
            </button>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-1 p-1 rounded-md hover:bg-slate-100"
              >
                <div className="h-8 w-8 rounded-full bg-primary-100 text-primary flex items-center justify-center text-small font-semibold">
                  {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
                <ChevronDown className="h-4 w-4 text-slate-500 hidden sm:block" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-1 w-56 rounded-md border border-slate-200 bg-white shadow-lg py-1 z-50">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-body font-medium text-slate-900 truncate">
                      {user?.name || 'User'}
                    </p>
                    <p className="text-small text-slate-500 truncate">
                      {user?.email}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full text-left px-3 py-2 text-body hover:bg-slate-50 flex items-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full text-left px-3 py-2 text-body hover:bg-slate-50 flex items-center gap-2"
                  >
                    <SettingsIcon className="h-4 w-4" />
                    Settings
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-3 py-2 text-body hover:bg-red-50 text-error flex items-center gap-2 border-t border-slate-100"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setMobileNavOpen(false)}
          />
          {/* Slide-down panel */}
          <div className="absolute top-16 left-0 right-0 bg-white border-b border-slate-200 shadow-lg py-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/dashboard'}
                className={({ isActive }) =>
                  clsx(
                    'block px-6 py-3 text-body font-medium border-l-4',
                    isActive
                      ? 'text-primary bg-primary-50 border-primary'
                      : 'text-slate-700 border-transparent hover:bg-slate-50'
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
