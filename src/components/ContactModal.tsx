import { useState } from "react";
import { FormField } from "@/components/ui/form-field";
import { RippleButton } from "@/components/ui/ripple-button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Send } from "lucide-react";

interface ContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ContactModal = ({ open, onOpenChange }: ContactModalProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successes, setSuccesses] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const validateField = (field: string, value: string) => {
    const newErrors = { ...errors };
    const newSuccesses = { ...successes };

    switch (field) {
      case 'name':
        if (!value.trim()) {
          newErrors.name = "Name is required";
          newSuccesses.name = false;
        } else if (value.trim().length < 2) {
          newErrors.name = "Name must be at least 2 characters";
          newSuccesses.message = false;
        } else {
          delete newErrors.message;
          newSuccesses.message = true;
        }
        break;
    }

    setErrors(newErrors);
    setSuccesses(newSuccesses);
    return !newErrors[field];
  };

  const handleFieldChange = (field: string, value: string) => {
    switch (field) {
      case 'name':
        setName(value);
        break;
      case 'email':
        setEmail(value);
        break;
      case 'message':
        setMessage(value);
        break;
    }

    // Validate field on change for immediate feedback
    if (value.trim()) {
      validateField(field, value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const isNameValid = validateField('name', name);
    const isEmailValid = validateField('email', email);
    const isMessageValid = validateField('message', message);

    if (!isNameValid || !isEmailValid || !isMessageValid) {
      toast({
        title: "Please fix the errors above",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Store in database
      const { error } = await supabase
        .from('contact_submissions')
        .insert([
          { name, email, message }
        ]);

      if (error) throw error;

      toast({
        title: "Message sent successfully!",
        description: "We'll get back to you within 24 hours.",
      });

      // Reset form
      setName("");
      setEmail("");
      setMessage("");
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting contact form:', error);
      toast({
        title: "Failed to send message",
        description: "Please try again or email us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Mail className="w-5 h-5" />
            <span>Contact Us</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <FormField
            label="Full Name"
            id="name"
            type="text"
            value={name}
            onChange={(value) => handleFieldChange("name", value)}
            placeholder="Enter your full name"
            error={errors.name}
            success={successes.name}
            required
          />

          <FormField
            label="Email Address"
            id="email"
            type="email"
            value={email}
            onChange={(value) => handleFieldChange("email", value)}
            placeholder="your.email@example.com"
            error={errors.email}
            success={successes.email}
            required
          />

          <FormField
            label="Message"
            id="message"
            type="textarea"
            value={message}
            onChange={(value) => handleFieldChange("message", value)}
            placeholder="Tell us how we can help you transform your admission process..."
            error={errors.message}
            success={successes.message}
            required
          />

          <RippleButton
            type="submit"
            variant="hero"
            disabled={isSubmitting}
            className="w-full hover-lift"
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Sending Message...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Message
              </>
            )}
          </RippleButton>
        </form>

        <div className="text-xs text-muted-foreground text-center">
          We typically respond within 24 hours. All messages are sent to admitconnectAI@gmail.com
        </div>
      </DialogContent>
    </Dialog>
  );
};