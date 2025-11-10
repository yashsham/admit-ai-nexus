import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock } from "lucide-react";

interface ScheduleDemoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ScheduleDemoModal = ({ open, onOpenChange }: ScheduleDemoModalProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const timeSlots = [
    "9:00 AM - 10:00 AM",
    "10:00 AM - 11:00 AM",
    "11:00 AM - 12:00 PM",
    "2:00 PM - 3:00 PM",
    "3:00 PM - 4:00 PM",
    "4:00 PM - 5:00 PM"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !company || !timeSlot) {
      toast({
        title: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Store in database
      const { error } = await supabase
        .from('demo_requests')
        .insert([
          { 
            name, 
            email, 
            company, 
            role, 
            preferred_time: timeSlot, 
            message 
          }
        ]);

      if (error) throw error;

      toast({
        title: "Demo scheduled successfully!",
        description: "We'll send you a calendar invite within the next hour. Check admitconnectAI@gmail.com",
      });

      // Reset form
      setName("");
      setEmail("");
      setCompany("");
      setRole("");
      setTimeSlot("");
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
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Schedule Your Demo</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@university.edu"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Institution/Company *</Label>
            <Input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Harvard University"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Your Role</Label>
            <Input
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Admissions Director"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeSlot">Preferred Time *</Label>
            <Select value={timeSlot} onValueChange={setTimeSlot} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a time slot" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((slot) => (
                  <SelectItem key={slot} value={slot}>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>{slot}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Additional Notes</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us about your specific needs or questions..."
              rows={3}
            />
          </div>

          <Button
            type="submit"
            variant="hero"
            disabled={isSubmitting}
            className="w-full hover-lift"
          >
            {isSubmitting ? "Scheduling..." : "Schedule Demo"}
          </Button>
        </form>

        <div className="text-xs text-muted-foreground text-center">
          Our team will send you a calendar invite within 1 hour. All times are in EST.
        </div>
      </DialogContent>
    </Dialog>
  );
};