import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { RippleButton } from "@/components/ui/ripple-button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { KeyRound, Mail, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ForgotPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ForgotPasswordModal = ({ open, onOpenChange }: ForgotPasswordModalProps) => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successes, setSuccesses] = useState<Record<string, boolean>>({});
  
  const { toast } = useToast();

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const newErrors = { ...errors };
    const newSuccesses = { ...successes };
    
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
    
    setErrors(newErrors);
    setSuccesses(newSuccesses);
    return !newErrors.email;
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (value.trim()) {
      validateEmail(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail(email)) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setIsEmailSent(true);
      toast({
        title: "Password reset email sent!",
        description: "Check your inbox for reset instructions.",
      });
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: "Failed to send reset email",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setIsEmailSent(false);
    setErrors({});
    setSuccesses({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-card/95 backdrop-blur-sm border-border/50">
        <DialogHeader>
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-bounce-in ${
            isEmailSent ? 'bg-green-500' : 'bg-ai-gradient'
          }`}>
            {isEmailSent ? (
              <CheckCircle className="w-8 h-8 text-white" />
            ) : (
              <KeyRound className="w-8 h-8 text-white" />
            )}
          </div>
          <DialogTitle className="text-2xl font-bold text-center">
            {isEmailSent ? "Check Your Email" : "Reset Password"}
          </DialogTitle>
        </DialogHeader>

        {isEmailSent ? (
          <div className="space-y-6 text-center animate-fade-in">
            <div className="space-y-4">
              <Mail className="w-12 h-12 mx-auto text-primary animate-bounce" />
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  We've sent password reset instructions to:
                </p>
                <p className="font-medium text-foreground">{email}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                If you don't see the email in your inbox, check your spam folder.
                The link will expire in 60 minutes for security.
              </p>
            </div>
            
            <div className="space-y-3">
              <RippleButton
                variant="hero"
                size="lg"
                className="w-full"
                onClick={handleClose}
              >
                Done
              </RippleButton>
              
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => setIsEmailSent(false)}
              >
                Send to different email
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 animate-slide-up">
            <div className="space-y-4">
              <p className="text-muted-foreground text-center">
                Enter your email address and we'll send you a link to reset your password.
              </p>
              
              <FormField
                label="Email Address"
                id="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="your.email@example.com"
                error={errors.email}
                success={successes.email}
                required
              />
            </div>

            <div className="space-y-3">
              <RippleButton
                type="submit"
                variant="hero"
                size="lg"
                className="w-full"
                disabled={isSubmitting || !email.trim()}
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Sending Reset Link...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </RippleButton>
              
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                onClick={handleClose}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};