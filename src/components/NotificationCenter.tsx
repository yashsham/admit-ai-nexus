import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Calendar, MessageSquare, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';

interface NotificationSettings {
  campaignUpdates: boolean;
  newResponses: boolean;
  scheduleReminders: boolean;
  weeklyReports: boolean;
}

export const NotificationCenter = () => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [settings, setSettings] = useState<NotificationSettings>({
    campaignUpdates: true,
    newResponses: true,
    scheduleReminders: true,
    weeklyReports: false
  });
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    checkNotificationPermission();
    loadNotificationSettings();
  }, [user]);

  const checkNotificationPermission = () => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  };

  const loadNotificationSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('notifications_enabled, email_alerts, sms_alerts')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading notification settings:', error);
        return;
      }

      if (data) {
        setSettings(prev => ({
          ...prev,
          campaignUpdates: data.notifications_enabled ?? true,
          newResponses: data.email_alerts ?? true,
          scheduleReminders: data.sms_alerts ?? false
        }));
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast({
        title: 'Not Supported',
        description: 'Your browser does not support notifications',
        variant: 'destructive'
      });
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        
        // Send welcome notification
        new Notification('AdmitConnect AI', {
          body: 'Notifications enabled! You\'ll now receive updates about your campaigns.',
          icon: '/favicon.ico',
          badge: '/favicon.ico'
        });

        toast({
          title: 'Success',
          description: 'Browser notifications enabled successfully!'
        });

        // Update profile settings
        await updateNotificationSettings({ ...settings, campaignUpdates: true });
      } else {
        toast({
          title: 'Permission Denied',
          description: 'Please enable notifications in your browser settings',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: 'Error',
        description: 'Failed to enable notifications',
        variant: 'destructive'
      });
    }
  };

  const updateNotificationSettings = async (newSettings: NotificationSettings) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          notifications_enabled: newSettings.campaignUpdates,
          email_alerts: newSettings.newResponses,
          sms_alerts: newSettings.scheduleReminders
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setSettings(newSettings);
      toast({
        title: 'Settings Updated',
        description: 'Notification preferences saved successfully'
      });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update notification settings',
        variant: 'destructive'
      });
    }
  };

  const sendTestNotification = () => {
    if (permission === 'granted') {
      new Notification('Test Notification', {
        body: 'This is a test notification from AdmitConnect AI',
        icon: '/favicon.ico',
        badge: '/favicon.ico'
      });
    }
  };

  const handleSettingChange = (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    updateNotificationSettings(newSettings);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold bg-ai-gradient bg-clip-text text-transparent mb-2">
          Notification Center
        </h2>
        <p className="text-muted-foreground">
          Stay updated with real-time alerts about your campaigns and responses
        </p>
      </div>

      {/* Browser Notifications */}
      <Card className="hover-scale transition-all duration-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Browser Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Push Notifications</p>
              <p className="text-sm text-muted-foreground">
                Get instant updates directly in your browser
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={permission === 'granted' ? 'default' : 'secondary'}>
                {permission === 'granted' ? 'Enabled' : 'Disabled'}
              </Badge>
              {permission !== 'granted' && (
                <Button
                  onClick={requestNotificationPermission}
                  variant="hero"
                  size="sm"
                  className="hover-lift"
                >
                  Enable
                </Button>
              )}
            </div>
          </div>

          {permission === 'granted' && (
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={sendTestNotification}
                className="hover-lift"
              >
                Send Test Notification
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="hover-scale transition-all duration-200">
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Campaign Updates
              </Label>
              <p className="text-sm text-muted-foreground">
                Notifications when campaigns start, complete, or need attention
              </p>
            </div>
            <Switch
              checked={settings.campaignUpdates}
              onCheckedChange={(checked) => handleSettingChange('campaignUpdates', checked)}
              disabled={permission !== 'granted'}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                New Responses
              </Label>
              <p className="text-sm text-muted-foreground">
                Immediate alerts when candidates respond to your outreach
              </p>
            </div>
            <Switch
              checked={settings.newResponses}
              onCheckedChange={(checked) => handleSettingChange('newResponses', checked)}
              disabled={permission !== 'granted'}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Schedule Reminders
              </Label>
              <p className="text-sm text-muted-foreground">
                Reminders for upcoming deadlines and follow-ups
              </p>
            </div>
            <Switch
              checked={settings.scheduleReminders}
              onCheckedChange={(checked) => handleSettingChange('scheduleReminders', checked)}
              disabled={permission !== 'granted'}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Weekly Reports
              </Label>
              <p className="text-sm text-muted-foreground">
                Weekly summary of campaign performance and metrics
              </p>
            </div>
            <Switch
              checked={settings.weeklyReports}
              onCheckedChange={(checked) => handleSettingChange('weeklyReports', checked)}
              disabled={permission !== 'granted'}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification History */}
      <Card className="hover-scale transition-all duration-200">
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Campaign "Fall 2024 Intake" completed</p>
                <p className="text-xs text-muted-foreground">2 hours ago</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">New response from candidate</p>
                <p className="text-xs text-muted-foreground">4 hours ago</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Weekly report is ready</p>
                <p className="text-xs text-muted-foreground">Yesterday</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};