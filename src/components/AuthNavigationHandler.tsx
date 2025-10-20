import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export const AuthNavigationHandler = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // Check if user just signed in and navigate to dashboard
    if (user && window.location.pathname === '/auth') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  return null;
};
