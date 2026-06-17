import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { FormField } from "@/components/ui/form-field";
import { RippleButton } from "@/components/ui/ripple-button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { Brain, Mail, Lock, User, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMode?: "signin" | "signup";
}

export const AuthModal = ({ open, onOpenChange, defaultMode = "signin" }: AuthModalProps) => {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(defaultMode);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successes, setSuccesses] = useState<Record<string, boolean>>({});

  const { toast } = useToast();
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const validateField = (field: string, value: string) => {
    const newErrors = { ...errors };
    const newSuccesses = { ...successes };

    switch (field) {
      case 'firstName':
      case 'lastName': {
        if (mode === 'signup') {
          if (!value.trim()) {
            newErrors[field] = `${field === 'firstName' ? 'First' : 'Last'} name is required`;
            newSuccesses[field] = false;
          } else if (value.trim().length < 2) {
            newErrors[field] = `${field === 'firstName' ? 'First' : 'Last'} name must be at least 2 characters`;
            newSuccesses[field] = false;
          } else {
            delete newErrors[field];
            newSuccesses[field] = true;
          }
        }
        break;
      }
      case 'email': {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value.trim()) {
          newErrors.email = "Email is required";
          newSuccesses.email = false;
        } else if (!emailRegex.test(value)) {
          newErrors.email = "Please enter a valid email address";
          newSuccesses.email = false;
        } else {
          delete newErrors.email;
          newSuccesses.email = true;
        }
        break;
      }
      case 'password': {
        if (mode !== 'forgot') {
          if (!value) {
            newErrors.password = "Password is required";
            newSuccesses.password = false;
          } else if (value.length < 8) {
            newErrors.password = "Password must be at least 8 characters";
            newSuccesses.password = false;
          } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
            newErrors.password = "Password must contain uppercase, lowercase, and number";
            newSuccesses.password = false;
          } else {
            delete newErrors.password;
            newSuccesses.password = true;
          }
        }
        break;
      }
      case 'confirmPassword': {
        if (mode === 'signup') {
          if (!value) {
            newErrors.confirmPassword = "Please confirm your password";
            newSuccesses.confirmPassword = false;
          } else if (value !== formData.password) {
            newErrors.confirmPassword = "Passwords do not match";
            newSuccesses.confirmPassword = false;
          } else {
            delete newErrors.confirmPassword;
            newSuccesses.confirmPassword = true;
          }
        }
        break;
      }
    }

    setErrors(newErrors);
    setSuccesses(newSuccesses);
    return !newErrors[field];
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Validate field on change for immediate feedback
    if (value.trim() || field === 'confirmPassword') {
      validateField(field, value);
    }
  };

  const validateForm = () => {
    let isValid = true;

    if (mode === 'signup') {
      isValid = validateField('firstName', formData.firstName) && isValid;
      isValid = validateField('lastName', formData.lastName) && isValid;
      isValid = validateField('confirmPassword', formData.confirmPassword) && isValid;
    }

    if (mode !== 'forgot') {
      isValid = validateField('password', formData.password) && isValid;
    }

    isValid = validateField('email', formData.email) && isValid;

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Please fix the errors above",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'signup') {
        const fullName = `${formData.firstName} ${formData.lastName}`.trim();
        await signUp(formData.email, formData.password, fullName);
        onOpenChange(false);
      } else if (mode === 'signin') {
        await signIn(formData.email, formData.password);
        onOpenChange(false);
      } else if (mode === 'forgot') {
        try {
          // Call our custom Edge Function to send the email
          const { error } = await supabase.functions.invoke('send-reset-email', {
            body: {
              email: formData.email,
              redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}reset-password`
            }
          });

          if (error) throw error;

          toast({
            title: "Password reset sent!",
            description: "Check your email for reset instructions.",
          });
          setMode('signin');
        } catch (error: any) {
          console.error("Reset failed details:", error);
          let errorMessage = error.message;
          if (!errorMessage && typeof error === 'object') {
            errorMessage = JSON.stringify(error);
          }
          if (error && error.context && error.context.json) {
            // Attempt to extract message from response body if available
            error.context.json().then((body: any) => {
              console.log("Error body:", body);
            }).catch(() => { });
          }

          toast({
            title: "Request Failed",
            description: errorMessage || "Check console for details",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast({
        title: "Authentication failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsSubmitting(true);
      await signInWithGoogle();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Google sign in error:', error);
      toast({
        title: "Google sign in failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: ""
    });
    setErrors({});
    setSuccesses({});
  };

  const switchMode = (newMode: "signin" | "signup" | "forgot") => {
    setMode(newMode);
    resetForm();
  };

  const getTitle = () => {
    switch (mode) {
      case 'signup': return 'Create Account';
      case 'forgot': return 'Reset Password';
      default: return 'Welcome Back';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'signup': return 'Join AdmitConnect AI and transform your admissions process';
      case 'forgot': return 'Enter your email to receive a password reset link';
      default: return 'Sign in to access your AdmitConnect AI dashboard';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card/95 backdrop-blur-sm border-border/50">
        <DialogHeader>
          <div className="w-16 h-16 bg-ai-gradient rounded-2xl flex items-center justify-center mx-auto mb-4 animate-bounce-in">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold text-center">
            {getTitle()}
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            {getDescription()}
          </DialogDescription>
        </DialogHeader>

        <ScrollReveal direction="up" className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="First Name"
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(value) => handleFieldChange("firstName", value)}
                  placeholder="John"
                  error={errors.firstName}
                  success={successes.firstName}
                  required
                />
                <FormField
                  label="Last Name"
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={(value) => handleFieldChange("lastName", value)}
                  placeholder="Doe"
                  error={errors.lastName}
                  success={successes.lastName}
                  required
                />
              </div>
            )}

            <FormField
              label="Email Address"
              id="email"
              type="email"
              value={formData.email}
              onChange={(value) => handleFieldChange("email", value)}
              placeholder="john@college.edu"
              error={errors.email}
              success={successes.email}
              required
            />

            {mode !== 'forgot' && (
              <FormField
                label="Password"
                id="password"
                type="password"
                value={formData.password}
                onChange={(value) => handleFieldChange("password", value)}
                placeholder="••••••••"
                error={errors.password}
                success={successes.password}
                required
              />
            )}

            {mode === 'signup' && (
              <FormField
                label="Confirm Password"
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(value) => handleFieldChange("confirmPassword", value)}
                placeholder="••••••••"
                error={errors.confirmPassword}
                success={successes.confirmPassword}
                required
              />
            )}

            <RippleButton
              type="submit"
              variant="hero"
              size="lg"
              className="w-full mt-6"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  {mode === 'signup' ? 'Creating Account...' : mode === 'forgot' ? 'Sending Reset...' : 'Signing In...'}
                </>
              ) : (
                mode === 'signup' ? 'Create Account' : mode === 'forgot' ? 'Send Reset Link' : 'Sign In'
              )}
            </RippleButton>
          </form>

          {mode !== 'forgot' && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <RippleButton
                variant="outline"
                size="lg"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                rippleColor="rgba(59, 130, 246, 0.3)"
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </RippleButton>
            </>
          )}

          <div className="space-y-2 text-center text-sm">
            {mode === 'signin' && (
              <>
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-primary hover:underline block w-full"
                >
                  Forgot your password?
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-muted-foreground hover:text-foreground hover:underline block w-full"
                >
                  Don't have an account? Sign up
                </button>
              </>
            )}

            {mode === 'signup' && (
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="text-muted-foreground hover:text-foreground hover:underline block w-full"
              >
                Already have an account? Sign in
              </button>
            )}

            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="text-muted-foreground hover:text-foreground hover:underline block w-full"
              >
                Back to sign in
              </button>
            )}
          </div>

          {mode === 'signup' && (
            <div className="text-xs text-muted-foreground text-center space-y-1">
              <div className="flex items-center justify-center space-x-1">
                <AlertCircle className="w-3 h-3" />
                <span>Password requirements:</span>
              </div>
              <ul className="space-y-1">
                <li>• At least 8 characters long</li>
                <li>• Contains uppercase and lowercase letters</li>
                <li>• Contains at least one number</li>
              </ul>
            </div>
          )}
        </ScrollReveal>
      </DialogContent>
    </Dialog>
  );
};