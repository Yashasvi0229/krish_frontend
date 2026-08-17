import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { User, Mail, LogOut, CheckCircle, XCircle } from 'lucide-react';
import Button from '../components/common/Button';
import ConfirmModal from '../components/common/ConfirmModal';
import useAuth from '../hooks/useAuth';
import { authApi, gmailApi } from '../services/api';

/**
 * Settings — simplified for current backend capabilities.
 *
 * Sections:
 *   * Profile      — shows JWT-decoded identity (no update endpoint yet)
 *   * Gmail        — status + connect/disconnect flow
 *   * Sign Out     — clears local state + calls /auth/signout
 *
 * Removed: About (unnecessary product info), Notifications, Preferences,
 * Sessions — those need backend endpoints we haven't built yet.
 */
const SECTIONS = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'gmail',   label: 'Gmail',   icon: Mail },
];

export default function Settings() {
  const { user, clearSession } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState('profile');
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const handleSignOut = async () => {
    try {
      await authApi.signOut();
    } catch {
      /* proceed with local clear regardless */
    }
    clearSession();
    navigate('/login', { replace: true });
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <h1 className="text-h1 text-slate-900 mb-6">Settings</h1>

      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
        {/* Left nav — becomes a horizontal tab row on mobile */}
        <nav className="lg:w-56 shrink-0">
          <ul className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
            {SECTIONS.map((s) => (
              <li key={s.key} className="shrink-0">
                <button
                  onClick={() => setSection(s.key)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-body text-left transition-colors whitespace-nowrap ${
                    section === s.key
                      ? 'bg-primary text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <s.icon className="h-4 w-4" />
                  {s.label}
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-4 pt-4 border-t border-slate-200 hidden lg:block">
            <button
              onClick={() => setConfirmSignOut(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-body text-error hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </nav>

        {/* Right content */}
        <div className="flex-1 min-w-0">
          {section === 'profile' && <ProfileSection user={user} />}
          {section === 'gmail' && <GmailSection />}

          {/* Sign out shows below on mobile */}
          <div className="lg:hidden mt-4">
            <Button
              variant="dangerText"
              fullWidth
              leftIcon={LogOut}
              onClick={() => setConfirmSignOut(true)}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmSignOut}
        onClose={() => setConfirmSignOut(false)}
        onConfirm={handleSignOut}
        title="Sign out?"
        message="You'll need to sign in again to access the system."
        confirmText="Sign Out"
        variant="danger"
      />
    </div>
  );
}

function ProfileSection({ user }) {
  return (
    <Card title="Profile">
      <div className="flex items-center gap-4 mb-4">
        <div className="h-16 w-16 rounded-full bg-primary-100 text-primary flex items-center justify-center text-h2 font-semibold">
          {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-h3 text-slate-900">{user?.name || '—'}</p>
          <p className="text-body text-slate-500">{user?.email}</p>
          <p className="text-small text-slate-500 mt-1">
            Role: <span className="text-slate-700 font-medium">{user?.role || 'Admin'}</span>
          </p>
        </div>
      </div>
      <p className="text-small text-slate-500 italic">
        Profile editing will be enabled in a future update.
      </p>
    </Card>
  );
}

function GmailSection() {
  const gmailQ = useQuery({
    queryKey: ['gmail-status'],
    queryFn: () => gmailApi.status().then((r) => r.data),
    refetchOnWindowFocus: false,
  });

  const status = gmailQ.data;
  const connected = status?.connected;

  const handleConnect = async () => {
    try {
      const { data } = await gmailApi.connect();
      if (data.auth_url) {
        window.location.href = data.auth_url;
      } else {
        toast.error('Could not get authorization URL.');
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to start OAuth');
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Gmail? You will need to reconnect before running new searches.')) {
      return;
    }
    try {
      await gmailApi.disconnect();
      toast.success('Gmail disconnected');
      gmailQ.refetch();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to disconnect');
    }
  };

  return (
    <Card title="Gmail Connection">
      {gmailQ.isLoading ? (
        <p className="text-body text-slate-500">Checking…</p>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-4">
            {connected ? (
              <CheckCircle className="h-6 w-6 text-success" />
            ) : (
              <XCircle className="h-6 w-6 text-slate-400" />
            )}
            <div>
              <p className="text-body font-medium text-slate-900">
                {connected ? 'Connected' : 'Not connected'}
              </p>
              {status?.email && (
                <p className="text-small text-slate-500">{status.email}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {connected ? (
              <>
                <Button variant="secondary" onClick={handleConnect}>
                  Reconnect
                </Button>
                <Button variant="dangerText" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              </>
            ) : (
              <Button onClick={handleConnect}>Connect Gmail</Button>
            )}
          </div>

          <p className="text-small text-slate-500 mt-4">
            Gmail is used to fetch claim-related emails and attachments for AI
            analysis. Read-only access.
          </p>
        </>
      )}
    </Card>
  );
}

function Card({ title, children }) {
  return (
    <div className="bg-white rounded-lg shadow-card border border-slate-200 p-4 sm:p-6">
      <h2 className="text-h3 text-slate-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}
