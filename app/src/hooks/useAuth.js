import useAuthStore from '../store/authStore';

export default function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const updateUser = useAuthStore((s) => s.updateUser);
  const isAdmin = user?.role === 'Admin';

  return { user, isAuthenticated, setSession, clearSession, updateUser, isAdmin };
}
