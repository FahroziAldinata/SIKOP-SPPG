import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setTokenState] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [permissionsReady, setPermissionsReady] = useState(false);
  const [loading, setLoading] = useState(true);

  // ponytail: theme state initialized by matchMedia prefers-color-scheme if localStorage is empty
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const fetchPermissions = async (currentToken) => {
    if (!currentToken) {
      setPermissions([]);
      setPermissionsReady(true);
      return;
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/my-permissions`, {
        headers: {
          'Authorization': `Bearer ${currentToken}`
        }
      });
      if (res.ok) {
        const resData = await res.json();
        const perms = resData.data?.permissions || resData.permissions || [];
        setPermissions(Array.isArray(perms) ? perms : []);
      } else {
        setPermissions([]);
      }
    } catch (e) {
      console.error('Fetch permissions failed:', e);
      setPermissions([]);
    } finally {
      setPermissionsReady(true);
    }
  };

  const hasPerm = (resourceOrPerm, aksi) => {
    if (user?.role === 'ADMIN') return true;
    if (!permissions || !Array.isArray(permissions)) return false;

    let res = resourceOrPerm;
    let act = aksi;

    if (typeof resourceOrPerm === 'string' && !aksi) {
      const parts = resourceOrPerm.split(':');
      res = parts[0];
      act = parts[1];
    }

    return permissions.some((p) => p.resource === res && p.aksi === act);
  };

  const login = async (newToken, newUser) => {
    localStorage.setItem('token', newToken);
    setTokenState(newToken);
    setUser(newUser);
    setPermissionsReady(false);
    await fetchPermissions(newToken);
  };

  const logout = async () => {
    const currentToken = token || localStorage.getItem('token');
    if (currentToken) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        await fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentToken}`
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch (e) {
        // Gagal / 401 / timeout -> TETAP hapus token lokal
      }
    }
    localStorage.removeItem('token');
    setTokenState(null);
    setUser(null);
    setPermissions([]);
    setPermissionsReady(false);
  };

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${storedToken}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            setUser(data);
            setTokenState(storedToken);
            await fetchPermissions(storedToken);
          } else {
            logout();
          }
        } catch (e) {
          console.error('Auth init failed:', e);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, permissions, permissionsReady, loading, login, logout, theme, toggleTheme, hasPerm }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

