import { createContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client'; // Note: Will be created in Step 18

export const AuthContext = createContext(null);

/**
 * Auth Provider.
 * Holds the current user state, checks for existing token on mount,
 * and provides login/logout methods globally.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('spendsense-token'));
  const [isInitializing, setIsInitializing] = useState(true);

  // Sync token to localStorage and configure Axios default headers
  useEffect(() => {
    if (token) {
      localStorage.setItem('spendsense-token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      localStorage.removeItem('spendsense-token');
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
        setUser(data.data.user);
      } catch (error) {
        // Token invalid or expired
        console.error('Failed to load user profile:', error);
        setToken(null);
        setUser(null);
      } finally {
        setIsInitializing(false);
      }
    };

    loadUser();
  }, [token]);

  const login = useCallback((userData, jwtToken) => {
    setToken(jwtToken);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, isInitializing, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
