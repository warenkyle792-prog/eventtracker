import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, onUnauthorized, setToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));
  const [sessionExpired, setSessionExpired] = useState(false);

  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      return null;
    }
    try {
      const { user: fresh } = await api.get('/auth/me');
      setUser(fresh);
      return fresh;
    } catch (error) {
      if (error.status === 401) {
        setToken(null);
        setUser(null);
      }
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refreshUser();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  /**
   * A 401 from anywhere means the stored session is gone. Clear the cached user
   * too, so gates and sign-in prompts appear instead of the app repeatedly
   * failing every action with the server's raw "Authentication required".
   */
  useEffect(() => onUnauthorized(() => {
    setUser(null);
    setSessionExpired(true);
  }), []);

  /** Resolves with the signed-in user (not the raw { token, user } payload). */
  const login = useCallback(async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    setToken(data.token);
    setUser(data.user);
    setSessionExpired(false);
    return data.user;
  }, []);

  /** Resolves with the newly registered user. */
  const register = useCallback(async (payload) => {
    const data = await api.post('/auth/register', payload);
    setToken(data.token);
    setUser(data.user);
    setSessionExpired(false);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setSessionExpired(false); // a deliberate sign-out is not an expired session
  }, []);

  /** Merge server-returned fields into the cached profile. */
  const patchUser = useCallback((patch) => {
    setUser((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      sessionExpired,
      isAdmin: user?.role === 'admin',
      isOrganizer: user?.role === 'admin' || user?.role === 'organizer',
      login,
      register,
      logout,
      refreshUser,
      patchUser,
      setUser,
    }),
    [user, loading, sessionExpired, login, register, logout, refreshUser, patchUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
