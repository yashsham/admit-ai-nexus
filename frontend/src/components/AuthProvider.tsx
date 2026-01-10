import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check if we're handling a redirect callback
    const isHandlingRedirect = window.location.hash && (
      window.location.hash.includes('access_token') ||
      window.location.hash.includes('refresh_token') ||
      window.location.hash.includes('error')
    );

    if (isHandlingRedirect) {
      console.log('Handling auth redirect, keeping loading state active...');
    }

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);

        setSession(session);
        setUser(session?.user ?? null);

        // If we have a session, we can stop loading immediately
        // If we don't have a session but we're NOT handling a redirect, we can stop loading
        // If we don't have a session AND we ARE handling a redirect, keep loading (wait for potential subsequent events)
        if (session || !isHandlingRedirect) {
          setLoading(false);
        }

        // Handle specific auth events
        if (event === 'SIGNED_IN') {
          // Create or update user profile
          if (session?.user) {
            setTimeout(() => {
              createOrUpdateProfile(session.user);
            }, 0);
          }
        } else if (event === 'SIGNED_OUT') {
          // Clear any local storage if needed
          localStorage.removeItem('sb-imlbkhgquajmnqgbvgwj-auth-token');
          setLoading(false); // Ensure loading is false on sign out
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      // Same logic as above
      if (session || !isHandlingRedirect) {
        setLoading(false);
      }
    });

    // Safety timeout: If we're handling a redirect but nothing happens for 5 seconds, stop loading
    // This prevents infinite loading screens if the hash is invalid or Supabase fails silently
    if (isHandlingRedirect) {
      const timeoutId = setTimeout(() => {
        console.log('Auth redirect timeout reached, forcing loading completion');
        setLoading(false);
      }, 5000);

      return () => {
        subscription.unsubscribe();
        clearTimeout(timeoutId);
      };
    }

    return () => subscription.unsubscribe();
  }, []);

  const createOrUpdateProfile = async (user: User) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name,
          display_name: user.user_metadata?.full_name || user.user_metadata?.name,
          avatar_url: user.user_metadata?.avatar_url,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error && error.code !== '23505') { // Ignore unique constraint errors
        console.error('Profile creation/update error:', error);
      }
    } catch (error) {
      console.error('Profile creation/update error:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password. Please check your credentials and try again.');
      } else if (error.message.includes('Email not confirmed')) {
        throw new Error('Please check your email and click the confirmation link before signing in.');
      } else {
        throw error;
      }
    }

    if (data.user) {
      toast({
        title: "Welcome back!",
        description: "Successfully signed in to your account.",
      });
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}${import.meta.env.BASE_URL}`;

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      if (error.message.includes('User already registered')) {
        throw new Error('An account with this email already exists. Please sign in instead.');
      } else if (error.message.includes('Password should be')) {
        throw new Error('Password must be at least 8 characters long.');
      } else {
        throw error;
      }
    }

    if (data.user && !data.user.email_confirmed_at) {
      toast({
        title: "Check your email",
        description: "We've sent you a confirmation link to verify your account.",
      });
    } else {
      toast({
        title: "Account created!",
        description: "Welcome to AdmitConnect AI.",
      });
    }
  };

  const signInWithGoogle = async () => {
    // Use origin only for redirect - the AuthNavigationHandler will redirect to dashboard after login
    const redirectUrl = `${window.location.origin}${import.meta.env.BASE_URL}`;
    console.log('Google Sign-In Redirect URL:', redirectUrl);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Sign out error:", error);
      // Continue to clear local state anyway
    }

    // Force clear session state and local storage
    setSession(null);
    setUser(null);
    localStorage.removeItem('sb-imlbkhgquajmnqgbvgwj-auth-token');

    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}reset-password`,
    });

    if (error) {
      throw error;
    }
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      throw error;
    }

    toast({
      title: "Password updated",
      description: "Your password has been successfully updated.",
    });
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};