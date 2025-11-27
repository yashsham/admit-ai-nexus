import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { User, Building2, Bell, Lock, Save } from 'lucide-react';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SettingsModal = ({ open, onOpenChange }: SettingsModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    college_name: '',
    college_address: '',
    college_website: '',
    notifications_enabled: true,
    email_alerts: true,
    sms_alerts: false
  });

  useEffect(() => {
    if (user && open) {
      loadProfile();
    }
  }, [user, open]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile({
          full_name: data.full_name || '',
          email: data.email || user?.email || '',
          college_name: data.college_name || '',
          college_address: data.college_address || '',
          college_website: data.college_website || '',
          notifications_enabled: data.notifications_enabled !== false,
          email_alerts: data.email_alerts !== false,
          sms_alerts: data.sms_alerts === true
        });
      } else {
        // Set default values if no profile exists
        setProfile(prev => ({
          ...prev,
          email: user?.email || '',
          full_name: user?.user_metadata?.full_name || ''
        }));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: "Error loading profile",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const saveProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert([
          {
            user_id: user.id,
            full_name: profile.full_name,
            email: profile.email,
            college_name: profile.college_name,
            college_address: profile.college_address,
            college_website: profile.college_website,
            notifications_enabled: profile.notifications_enabled,
            email_alerts: profile.email_alerts,
            sms_alerts: profile.sms_alerts
          }
        ], {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your settings have been saved successfully",
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Save failed",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="college">College</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Personal Information</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={profile.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Enter your email"
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="college" className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">College Information</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="college_name">College/University Name</Label>
                  <Input
                    id="college_name"
                    value={profile.college_name}
                    onChange={(e) => handleInputChange('college_name', e.target.value)}
                    placeholder="Enter your institution name"
                  />
                </div>

                <div>
                  <Label htmlFor="college_address">Address</Label>
                  <Textarea
                    id="college_address"
                    value={profile.college_address}
                    onChange={(e) => handleInputChange('college_address', e.target.value)}
                    placeholder="Enter your institution address"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="college_website">Website</Label>
                  <Input
                    id="college_website"
                    type="url"
                    value={profile.college_website}
                    onChange={(e) => handleInputChange('college_website', e.target.value)}
                    placeholder="https://your-college.edu"
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Notification Preferences</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="notifications_enabled" className="text-base font-normal">
                      Enable Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications about your campaigns
                    </p>
                  </div>
                  <Switch
                    id="notifications_enabled"
                    checked={profile.notifications_enabled}
                    onCheckedChange={(checked) => handleInputChange('notifications_enabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email_alerts" className="text-base font-normal">
                      Email Alerts
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Get campaign updates via email
                    </p>
                  </div>
                  <Switch
                    id="email_alerts"
                    checked={profile.email_alerts}
                    onCheckedChange={(checked) => handleInputChange('email_alerts', checked)}
                    disabled={!profile.notifications_enabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="sms_alerts" className="text-base font-normal">
                      SMS Alerts
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Get important updates via SMS
                    </p>
                  </div>
                  <Switch
                    id="sms_alerts"
                    checked={profile.sms_alerts}
                    onCheckedChange={(checked) => handleInputChange('sms_alerts', checked)}
                    disabled={!profile.notifications_enabled}
                  />
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={saveProfile}
            disabled={loading}
            variant="hero"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};