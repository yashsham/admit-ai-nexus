import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, Send } from "lucide-react";

interface ScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ScheduleModal = ({ open, onOpenChange }: ScheduleModalProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !preferredTime) {
      toast({
        title: "Please fill in required fields",
        description: "Name, email, and preferred time are required.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('schedule_demos')
        .insert([
          { name, email, preferred_time: preferredTime, message }
        ]);

      if (error) throw error;

      toast({
        title: "Demo scheduled successfully!",
        description: "We'll contact you within 24 hours to confirm your demo.",
      });

      // Reset form
      setName("");
      setEmail("");
      setPreferredTime("");
      setMessage("");
      onOpenChange(false);
    } catch (error) {
      console.error('Error scheduling demo:', error);
      toast({
        title: "Failed to schedule demo",
        description: "Please try again or contact us directly.",
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
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Schedule a Demo
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@college.edu"
              required
            />
          </div>

          <div>
            <Label htmlFor="preferredTime">Preferred Time *</Label>
            <Input
              id="preferredTime"
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
              placeholder="e.g., Next Tuesday 2 PM EST"
              required
            />
          </div>

          <div>
            <Label htmlFor="message">Additional Notes</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us about your requirements..."
              rows={3}
            />
          </div>

          <Button
            type="submit"
            variant="hero"
            size="lg"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Schedule Demo
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};