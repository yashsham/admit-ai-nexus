import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Bell, Calendar, MessageSquare, TrendingUp, Check, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';

interface NotificationSettings {
  campaignUpdates: boolean;
  newResponses: boolean;
  scheduleReminders: boolean;
  weeklyReports: boolean;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string;
  read: boolean;
  created_at: string;
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
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  const loadNotificationSettings = useCallback(async () => {
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
  }, [user]);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notifications' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotifications((data as unknown as NotificationItem[]) || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }, [user]);

  const subscribeToNotifications = useCallback(() => {
    if (!user) return;

    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Real-time notification update:', payload);
          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new as unknown as NotificationItem;
            setNotifications(prev => [newNotification, ...prev]);

            // Show browser notification if enabled
            // Use global property to avoid stale closure
            if (Notification.permission === 'granted') {
              new Notification(newNotification.title, {
                body: newNotification.message,
                icon: '/favicon.ico'
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotification = payload.new as unknown as NotificationItem;
            setNotifications(prev => prev.map(n => n.id === updatedNotification.id ? updatedNotification : n));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            setNotifications(prev => prev.filter(n => n.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    requestNotificationPermission();
    let cleanup: (() => void) | undefined;

    if (user) {
      loadNotificationSettings();
      loadNotifications();
      cleanup = subscribeToNotifications();
    }

    return () => {
      cleanup?.();
    };
  }, [user, loadNotificationSettings, loadNotifications, subscribeToNotifications]);

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

  const sendTestNotification = async () => {
    if (!user) return;

    // Insert a fake notification into DB to test realtime
    try {
      const { error } = await supabase
        .from('notifications' as any)
        .insert({
          user_id: user.id,
          title: 'Test Notification',
          message: 'This is a test notification from AdmitConnect AI',
          type: 'info'
        });

      if (error) throw error;

      toast({
        title: 'Sent',
        description: 'Test notification sent to database'
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to send test notification',
        variant: 'destructive'
      });
    }
  };

  const handleSettingChange = (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    updateNotificationSettings(newSettings);
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications' as any)
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
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
            {notifications.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No notifications yet</p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${notification.read ? 'bg-muted/30' : 'bg-muted/80'}`}
                >
                  <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${notification.type === 'success' ? 'bg-green-500' :
                    notification.type === 'error' ? 'bg-red-500' :
                      notification.type === 'warning' ? 'bg-orange-500' :
                        'bg-blue-500'
                    }`}></div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${notification.read ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {notification.title}
                    </p>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(notification.created_at).toLocaleTimeString()} · {new Date(notification.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {!notification.read && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => markAsRead(notification.id)} title="Mark as read">
                        <Check className="w-3 h-3" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteNotification(notification.id)} title="Delete">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};