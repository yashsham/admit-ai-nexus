import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export const AuthNavigationHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Don't navigate while still loading auth state
    if (loading) return;
    
    // Only redirect once per auth session to avoid loops
    if (hasRedirected.current) return;

    // Check if user just signed in and navigate to dashboard
    // Handle both /auth page and root with hash (OAuth callback)
    const isAuthPage = location.pathname === '/auth';
    const isOAuthCallback = location.pathname === '/' && (
      location.hash.includes('access_token') || 
      window.location.hash.includes('access_token')
    );

    if (user && (isAuthPage || isOAuthCallback)) {
      console.log('User authenticated, redirecting to dashboard...');
      hasRedirected.current = true;
      
      // Clear the hash from URL before navigating
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname);
      }
      
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate, location]);

  // Reset redirect flag when user signs out
  useEffect(() => {
    if (!user) {
      hasRedirected.current = false;
    }
  }, [user]);

  return null;
};
