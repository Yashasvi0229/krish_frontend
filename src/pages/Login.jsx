import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Mail, Lock, LogIn } from 'lucide-react';
import Button from '../components/common/Button';
import { Input } from '../components/common/Input';
import Logo from '../components/common/Logo';
import useAuth from '../hooks/useAuth';
import { authApi } from '../services/api';

/**
 * Login screen — email + password (matches backend POST /api/auth/login).
 *
 * Design notes:
 *   * Mobile-first — centered card that scales down cleanly to phone width.
 *   * Enter on either field submits (react-hook-form default).
 *   * Password visibility toggle for laptop users typing complex passwords.
 *   * Errors show inline per field AND as a top banner for network / 401.
 *   * Auto-redirects to /dashboard if user is already authenticated.
 */
const schema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export default function Login() {
  const { isAuthenticated, setSession } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  // Already signed in → skip login
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async ({ email, password }) => {
    setServerError(null);
    try {
      const { data } = await authApi.login(email, password);
      // Backend returns: { access_token, token_type, expires_in, user }
      setSession({ user: data.user, token: data.access_token });
      toast.success(`Welcome, ${data.user?.name || data.user?.email}`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      // Backend returns { detail: '...' } on auth failure
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        (err?.response?.status === 401
          ? 'Invalid email or password.'
          : 'Sign-in failed. Please try again.');
      setServerError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top banner for server / network errors */}
      {serverError && (
        <div className="bg-red-50 border-b border-error/20 px-4 py-3">
          <p className="text-body text-error text-center">{serverError}</p>
        </div>
      )}

      {/* Centered card — max-w-md keeps it comfortable on desktop, w-full on phone */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Brand block */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <Logo size="xl" />
            </div>
            <h1 className="text-h1 text-primary mb-2">
               Invoice Automation
            </h1>
            <p className="text-body text-slate-600">
              Streamline your invoice preparation with AI-powered automation
            </p>
          </div>

          {/* Form card */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="bg-white rounded-lg shadow-md border border-slate-200 p-6 sm:p-8 space-y-4"
            noValidate
          >
            <div>
              <h2 className="text-h2 text-slate-900 mb-1">Welcome back</h2>
              <p className="text-body text-slate-500">
                Sign in with your GNC account
              </p>
            </div>

            <Input
              label="Email"
              type="email"
              autoComplete="username"
              placeholder="you@gncgroup.ca"
              leftIcon={Mail}
              error={errors.email?.message}
              {...register('email')}
            />

            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                leftIcon={Lock}
                error={errors.password?.message}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="mt-1 text-small text-primary hover:underline"
              >
                {showPassword ? 'Hide password' : 'Show password'}
              </button>
            </div>

            <Button
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting}
              fullWidth
              size="lg"
              leftIcon={isSubmitting ? undefined : LogIn}
            >
              {isSubmitting ? 'Signing in…' : 'Sign In'}
            </Button>

            <p className="text-small text-slate-500 text-center">
              Need access? Contact your administrator.
            </p>
          </form>
        </div>
      </div>

      <footer className="py-4 text-center">
        <p className="text-small text-slate-500">
          © 2026 GNC Group. All rights reserved.
        </p>
        <p className="text-small text-slate-400">v1.0.0</p>
      </footer>
    </div>
  );
}
