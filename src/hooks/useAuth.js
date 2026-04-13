import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';

export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { setAuth, clearAuth, refreshToken } = useAuthStore();

  const login = async (loginId, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authApi.login({ login: loginId, password });
      setAuth(data.user, data.access, data.refresh);
      // Role-based redirect
      if (data.user.role === 'superuser') {
        navigate('/dashboard', { replace: true });
      } else if (data.user.role === 'manager') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch (e) {
      console.error('Logout API failed', e);
    } finally {
      clearAuth();
      navigate('/login', { replace: true });
    }
  };

  return { login, logout, loading, error };
};
