import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setSession: ({ user, token }) => {
        localStorage.setItem('gnc_access_token', token);
        set({ user, token, isAuthenticated: true });
      },

      updateUser: (partial) =>
        set((state) => ({ user: { ...state.user, ...partial } })),

      clearSession: () => {
        localStorage.removeItem('gnc_access_token');
        set({ user: null, token: null, isAuthenticated: false });
      },

      isAdmin: () => get().user?.role === 'Admin',
    }),
    {
      name: 'gnc_user',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);

export default useAuthStore;
