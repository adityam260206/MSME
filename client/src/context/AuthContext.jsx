import { createContext, useState, useEffect, useCallback, useContext } from 'react';
import api from '../api/client';

export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('msme360-token'));
  const [capabilities, setCapabilities] = useState([]);
  const [tenantId, setTenantId] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Sync token with localStorage and Axios header
  useEffect(() => {
    if (token) {
      localStorage.setItem('msme360-token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      localStorage.removeItem('msme360-token');
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Load user profile on mount if token exists
  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setIsInitializing(false);
        return;
      }

      try {
        const { data } = await api.get('/auth/me');
        if (data.success && data.data) {
          setUser(data.data.user);
          setCapabilities(data.data.capabilities || []);
          setTenantId(data.data.tenant_id);
        }
      } catch (error) {
        console.error('Session expired or invalid token:', error.message);
        setToken(null);
        setUser(null);
        setCapabilities([]);
        setTenantId(null);
      } finally {
        setIsInitializing(false);
      }
    };

    loadUser();
  }, [token]);

  const login = useCallback((userData, jwtToken, userCaps = []) => {
    setToken(jwtToken);
    setUser(userData);
    setCapabilities(userCaps);
    setTenantId(userData?.tenant_id || null);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setCapabilities([]);
    setTenantId(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ? String(user.role).toUpperCase() : null,
        token,
        tenantId,
        capabilities,
        isAuthenticated: !!user,
        isInitializing,
        login,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
