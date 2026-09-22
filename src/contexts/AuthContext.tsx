import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  username?: string;
  student_id?: string;
  teacher_code?: string;
  first_name?: string;
  last_name?: string;
  displayName?: string;
  class?: string;
  email?: string;
  phone?: string;
  userType: 'admin' | 'student' | 'teacher';
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, userType: 'student' | 'admin' | 'teacher') => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeUser = (user: User): User => ({
  ...user,
  displayName:
    user.displayName ||
    [user.first_name, user.last_name].filter(Boolean).join(' ') ||
    user.username ||
    user.teacher_code,
  email: user.email || user.student_id || user.username || user.teacher_code,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore and normalize the logged-in user so older localStorage data also
    // gets the display name and student identifier fields expected by the UI.
    const storedUser = localStorage.getItem('examUser');
    if (storedUser) {
      try {
        const normalizedUser = normalizeUser(JSON.parse(storedUser));
        setUser(normalizedUser);
        localStorage.setItem('examUser', JSON.stringify(normalizedUser));
      } catch {
        localStorage.removeItem('examUser');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string, userType: 'student' | 'admin' | 'teacher') => {
    const { data, error } = await supabase.functions.invoke('auth', {
      body: { username, password, userType },
    });

    if (error) {
      let message = 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ';
      const context = (error as { context?: Response }).context;
      if (context && typeof context.json === 'function') {
        try {
          const payload = await context.json();
          if (payload?.error) message = payload.error;
        } catch {
          // keep the default message
        }
      }
      throw new Error(message);
    }

    if (!data?.user) {
      throw new Error(data?.error || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    }

    const authenticatedUser = normalizeUser(data.user);
    setUser(authenticatedUser);
    localStorage.setItem('examUser', JSON.stringify(authenticatedUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('examUser');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
