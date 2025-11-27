import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FormField } from "@/components/ui/form-field";
import { RippleButton } from "@/components/ui/ripple-button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Card } from "@/components/ui/card";
import { KeyRound, CheckCircle } from "lucide-react";
import { SEO } from "@/components/SEO";

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successes, setSuccesses] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Listen for auth state changes to handle password recovery flow
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        // User is in password recovery mode, session is valid
        console.log("Password recovery session active");
      } else if (event === "SIGNED_IN") {
        // User is signed in, potentially after recovery or just normal login
        // We allow them to stay on this page to reset password if they wish
      } else if (event === "SIGNED_OUT") {
        // If they are signed out, they shouldn't be here unless they are just arriving
        // We give a small grace period or check if we have a hash
        const hash = window.location.hash;
        if (!hash || !hash.includes("type=recovery")) {
          // If no recovery hash and no session, redirect
          // But we wait a bit to ensure it's not just loading
        }
      }
    });

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // If no session, check if we have the recovery hash, if so, wait for the event
        const hash = window.location.hash;
        if (!hash || !hash.includes("type=recovery")) {
          toast({
            title: "Invalid or expired reset link",
            description: "Please request a new password reset link.",
            variant: "destructive",
          });
          navigate("/auth");
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, toast]);

  const validatePassword = (value: string) => {
    const newErrors = { ...errors };
    const newSuccesses = { ...successes };

    if (!value.trim()) {
      newErrors.password = "Password is required";
      newSuccesses.password = false;
    } else if (value.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
      newSuccesses.password = false;
    } else {
      delete newErrors.password;
      newSuccesses.password = true;
    }

    setErrors(newErrors);
    setSuccesses(newSuccesses);
    return !newErrors.password;
  };

  const validateConfirmPassword = (value: string) => {
    const newErrors = { ...errors };
    const newSuccesses = { ...successes };

    if (!value.trim()) {
      newErrors.confirmPassword = "Please confirm your password";
      newSuccesses.confirmPassword = false;
    } else if (value !== newPassword) {
      newErrors.confirmPassword = "Passwords do not match";
      newSuccesses.confirmPassword = false;
    } else {
      delete newErrors.confirmPassword;
      newSuccesses.confirmPassword = true;
    }

    setErrors(newErrors);
    setSuccesses(newSuccesses);
    return !newErrors.confirmPassword;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isPasswordValid = validatePassword(newPassword);
    const isConfirmValid = validateConfirmPassword(confirmPassword);

    if (!isPasswordValid || !isConfirmValid) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setIsSuccess(true);
      toast({
        title: "Password reset successful!",
        description: "You can now sign in with your new password.",
      });

      setTimeout(() => {
        navigate("/auth");
      }, 2000);
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: "Failed to reset password",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <SEO
        title="Reset Password - AdmitConnect AI"
        description="Reset your AdmitConnect AI account password"
      />

      <Card className="max-w-md w-full p-8 bg-card/95 backdrop-blur-sm border-border/50">
        {isSuccess ? (
          <div className="text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto bg-green-500 animate-bounce-in">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2">Password Reset!</h1>
              <p className="text-muted-foreground">
                Redirecting you to sign in...
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-ai-gradient animate-bounce-in">
                <KeyRound className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Reset Your Password</h1>
              <p className="text-muted-foreground">
                Enter your new password below
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField
                label="New Password"
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(value) => {
                  setNewPassword(value);
                  if (value.trim()) validatePassword(value);
                }}
                placeholder="Enter new password"
                error={errors.password}
                success={successes.password}
                required
              />

              <FormField
                label="Confirm Password"
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(value) => {
                  setConfirmPassword(value);
                  if (value.trim()) validateConfirmPassword(value);
                }}
                placeholder="Confirm new password"
                error={errors.confirmPassword}
                success={successes.confirmPassword}
                required
              />

              <RippleButton
                type="submit"
                variant="hero"
                size="lg"
                className="w-full"
                disabled={isSubmitting || !newPassword.trim() || !confirmPassword.trim()}
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Resetting Password...
                  </>
                ) : (
                  "Reset Password"
                )}
              </RippleButton>
            </form>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ResetPassword;