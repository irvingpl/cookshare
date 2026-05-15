'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User } from '@/types';
import { api, saveTokens, clearTokens, getRefreshToken } from '@/lib/api';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      // 서버에서 refresh token 무효화 (실패해도 클라이언트는 초기화)
      api.auth.logout(refreshToken).catch(() => null);
    }
    clearTokens();
    setUser(null);
  }, []);

  useEffect(() => {
    // accessToken이 있으면 사용자 정보 복원, 없으면 refreshToken으로 갱신 시도
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (!accessToken && !refreshToken) {
      setIsLoading(false);
      return;
    }

    api.auth.me()
      .then(({ user }) => setUser(user))
      .catch(async () => {
        // accessToken 만료 → refreshToken으로 갱신 후 재시도
        if (refreshToken) {
          try {
            const { accessToken: newAccess, refreshToken: newRefresh } =
              await api.auth.refresh(refreshToken);
            saveTokens(newAccess, newRefresh);
            const { user } = await api.auth.me();
            setUser(user);
          } catch {
            clearTokens();
          }
        } else {
          clearTokens();
        }
      })
      .finally(() => setIsLoading(false));

    // 다른 탭/api.ts에서 발생한 강제 로그아웃 이벤트 수신
    const handleForceLogout = () => { setUser(null); };
    window.addEventListener('auth:logout', handleForceLogout);
    return () => window.removeEventListener('auth:logout', handleForceLogout);
  }, []);

  function login(accessToken: string, refreshToken: string, newUser: User) {
    saveTokens(accessToken, refreshToken);
    setUser(newUser);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
