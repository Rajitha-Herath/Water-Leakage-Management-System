import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nwsdb_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('nwsdb_token')));

  const logout = useCallback(() => {
    localStorage.removeItem('nwsdb_token');
    localStorage.removeItem('nwsdb_user');
    setUser(null);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('nwsdb_token');
    if (!token) { setLoading(false); return undefined; }
    api.get('/auth/me')
      .then(({ data }) => {
        setUser(data.user);
        localStorage.setItem('nwsdb_user', JSON.stringify(data.user));
      })
      .catch(logout)
      .finally(() => setLoading(false));
    window.addEventListener('nwsdb:unauthorized', logout);
    return () => window.removeEventListener('nwsdb:unauthorized', logout);
  }, [logout]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (data.user.role !== 'OIC') throw new Error('The web dashboard is restricted to Officer-in-Charge accounts.');
    localStorage.setItem('nwsdb_token', data.token);
    localStorage.setItem('nwsdb_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

