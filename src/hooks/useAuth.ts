'use client';

import { useState, useCallback, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'operator' | 'viewer';
  createdAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
}

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// API base URL including /api prefix — matches backend global prefix
const _API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:4001`
    : 'http://localhost:4001');
const API_URL = `${_API_BASE}/api`;

const AUTH_COOKIE = 'kpatrol_access_token';

function setAuthCookie(token: string, days = 7) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 86_400_000).toUTCString();
  document.cookie = `${AUTH_COOKIE}=${token}; expires=${expires}; path=/; SameSite=Lax`;
}

function clearAuthCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${AUTH_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Initialize auth state from storage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const userStr = localStorage.getItem('user');

        if (token && userStr) {
          const user = JSON.parse(userStr) as User;
          
          // Verify token is still valid
          const response = await fetch(`${API_URL}/auth/verify`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            setAuthCookie(token);
            setState({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
            });
            return;
          }

          // Token invalid, try refresh
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            await refreshAccessToken(refreshToken);
            return;
          }
        }
      } catch (error) {
        console.error('[Auth] Init failed:', error);
      }

      // No valid auth found
      setState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    };

    initAuth();
  }, []);

  // Refresh access token
  const refreshAccessToken = async (refreshToken: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data: AuthResponse = await response.json();
        
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        setAuthCookie(data.accessToken);

        setState({
          user: data.user,
          token: data.accessToken,
          isAuthenticated: true,
          isLoading: false,
        });

        return true;
      }
    } catch (error) {
      console.error('[Auth] Refresh failed:', error);
    }

    // Refresh failed, logout
    logout();
    return false;
  };

  // Login
  const login = useCallback(async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok) {
        const authData = data as AuthResponse;

        // Store tokens
        localStorage.setItem('accessToken', authData.accessToken);
        localStorage.setItem('user', JSON.stringify(authData.user));
        setAuthCookie(authData.accessToken, credentials.rememberMe ? 30 : 1);
        
        if (credentials.rememberMe) {
          localStorage.setItem('refreshToken', authData.refreshToken);
        } else {
          sessionStorage.setItem('refreshToken', authData.refreshToken);
        }

        setState({
          user: authData.user,
          token: authData.accessToken,
          isAuthenticated: true,
          isLoading: false,
        });

        return { success: true };
      }

      setState((prev) => ({ ...prev, isLoading: false }));
      return { success: false, error: data.message || 'Đăng nhập thất bại' };
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return { success: false, error: 'Không thể kết nối tới server' };
    }
  }, []);

  // Register
  const register = useCallback(async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        const authData = result as AuthResponse;

        localStorage.setItem('accessToken', authData.accessToken);
        localStorage.setItem('refreshToken', authData.refreshToken);
        localStorage.setItem('user', JSON.stringify(authData.user));
        setAuthCookie(authData.accessToken);

        setState({
          user: authData.user,
          token: authData.accessToken,
          isAuthenticated: true,
          isLoading: false,
        });

        return { success: true };
      }

      setState((prev) => ({ ...prev, isLoading: false }));
      return { success: false, error: result.message || 'Đăng ký thất bại' };
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return { success: false, error: 'Không thể kết nối tới server' };
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('[Auth] Logout error:', error);
    }

    // Clear storage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('selectedRobotId');
    sessionStorage.removeItem('refreshToken');
    clearAuthCookie();

    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });

    // Hard redirect so all providers (RobotProvider, etc.) reset cleanly
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }, []);

  // Update profile
  const updateProfile = useCallback(async (updates: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${API_URL}/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}`,
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (response.ok) {
        const updatedUser = { ...state.user, ...data } as User;
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        setState((prev) => ({
          ...prev,
          user: updatedUser,
        }));

        return { success: true };
      }

      return { success: false, error: data.message || 'Cập nhật thất bại' };
    } catch (error) {
      return { success: false, error: 'Không thể kết nối tới server' };
    }
  }, [state.token, state.user]);

  // Change password
  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true };
      }

      return { success: false, error: data.message || 'Đổi mật khẩu thất bại' };
    } catch (error) {
      return { success: false, error: 'Không thể kết nối tới server' };
    }
  }, [state.token]);

  // Forgot password
  const forgotPassword = useCallback(async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true };
      }

      return { success: false, error: data.message || 'Không thể gửi email' };
    } catch (error) {
      return { success: false, error: 'Không thể kết nối tới server' };
    }
  }, []);

  return {
    // State
    user: state.user,
    token: state.token,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,

    // Actions
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    forgotPassword,
  };
}
