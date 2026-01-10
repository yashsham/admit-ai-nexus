import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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

  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const email = searchParams.get("email");

  // If token is present, we need manual verification.
  const [verificationNeeded, setVerificationNeeded] = useState(!!token || !!tokenHash);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    // If we have a token, we are effectively in "recovery mode" but need manual verification
    if (token || tokenHash) {
      return;
    }

    // Standard session check (fallback for when session is already established)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast({
          title: "Invalid or expired reset link",
          description: "Please request a new password reset link.",
          variant: "destructive",
        });
        navigate("/auth");
      }
    });
  }, [navigate, toast, token, tokenHash]);

  const handleVerify = async () => {
    if ((!token && !tokenHash) || !email) return;
    setIsVerifying(true);
    console.log("Verifying Identity with:", { token, tokenHash, email, type: 'recovery' });

    try {
      let error;

      // Heuristic: If we have a token_hash explicitly, use it.
      // IF we have a 'token' but it looks like a hash (long hex string), try treating it as a token_hash first.
      const candidateHash = tokenHash || (token && token.length > 20 ? token : null);

      if (candidateHash) {
        console.log("Using token_hash flow (detected hash)");
        const res = await supabase.auth.verifyOtp({
          token_hash: candidateHash,
          type: 'recovery',
          // email is NOT allowed with token_hash (PKCE flow)
        });
        error = res.error;

        // Fallback: If token_hash failed but we synthesized it from 'token', try raw 'token' just in case.
        if (error && !tokenHash && token) {
          console.log("token_hash failed, retrying with standard token...");
          const retryRes = await supabase.auth.verifyOtp({
            token,
            type: 'recovery',
            email
          });
          if (!retryRes.error) {
            error = null;
          }
        }
      } else {
        console.log("Using standard token flow");
        const res = await supabase.auth.verifyOtp({
          token,
          type: 'recovery',
          email
        });
        error = res.error;
      }

      if (error) {
        console.error("verifyOtp error:", error);
        throw error;
      }

      console.log("Identity verified successfully");
      setVerificationNeeded(false);
      toast({
        title: "Identity Verified",
        description: "Please set your new password.",
      });
    } catch (error: any) {
      console.error("Verification Catch Block:", error);
      toast({
        title: "Verification Failed",
        description: error.message || "Link expired or invalid",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

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
        ) : verificationNeeded ? (
          <div className="text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-ai-gradient animate-bounce-in">
              <KeyRound className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Verify Your Identity</h1>
            <p className="text-muted-foreground">
              Click the button below to verify your email and reset your password.
            </p>
            <RippleButton
              onClick={handleVerify}
              variant="hero"
              size="lg"
              className="w-full"
              disabled={isVerifying}
            >
              {isVerifying ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Verifying...
                </>
              ) : (
                "Verify Identity"
              )}
            </RippleButton>
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