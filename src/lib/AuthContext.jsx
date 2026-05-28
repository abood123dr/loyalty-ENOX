import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/api/base44Client';
import { isPlatformAdmin } from './roles';

const AuthContext = createContext();

const withAppRole = (authUser) => {
  if (!authUser) return null;

  return {
    ...authUser,
    role: isPlatformAdmin(authUser) ? 'super_admin' : authUser.role,
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    // تحقق من الجلسة الحالية
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(withAppRole(session?.user));
      setIsAuthenticated(!!session);
      setIsLoadingAuth(false);
    });

    // استمع لتغييرات الـ Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(withAppRole(session?.user));
      setIsAuthenticated(!!session);
      setIsLoadingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = '/login';
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  const checkUserAuth = async () => {
    setIsLoadingAuth(true);
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    setUser(withAppRole(currentUser));
    setIsAuthenticated(!!currentUser);
    setIsLoadingAuth(false);
    return currentUser;
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings: false,
      authError: null,
      appPublicSettings: null,
      authChecked: !isLoadingAuth,
      logout,
      navigateToLogin,
      checkUserAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
