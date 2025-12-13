import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Play,
  Pause,
  Settings,
  MessageSquare,
  Phone,
  Mail,
  Clock,
  Users,
  Zap,
  Plus,
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { FadeIn } from "@/components/ui/scroll-reveal";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/integrations/supabase/client";

interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  channels: string[];
  delay: number;
  template: string;
  active: boolean;
  user_id?: string;
}

export const CampaignAutomation = () => {
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewRule, setShowNewRule] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // New rule form state
  const [newRule, setNewRule] = useState({
    name: '',
    trigger: 'no_response',
    channels: [] as string[],
    delay: 24,
    template: '',
    active: true
  });

  const triggers = [
    { value: 'no_response', label: 'No Response After Message' },
    { value: 'email_open', label: 'Email Opened' },
    { value: 'link_click', label: 'Link Clicked' },
    { value: 'form_submit', label: 'Form Submitted' },
    { value: 'time_based', label: 'Time-Based Follow-up' }
  ];

  const channels = [
    { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { value: 'voice', label: 'Voice Call', icon: Phone },
    { value: 'email', label: 'Email', icon: Mail }
  ];

  const defaultTemplates: Record<string, string> = {
    whatsapp: "Hi {name}, I wanted to follow up on our previous message about {college}. Do you have any questions about our programs?",
    voice: "Hello {name}, this is a follow-up call regarding your interest in {college}. Please call us back at your convenience.",
    email: "Dear {name},\n\nWe noticed you showed interest in {college}. We'd love to answer any questions you might have about our programs.\n\nBest regards,\nAdmissions Team"
  };

  const loadAutomationRules = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform snake_case DB columns to component's expected format if needed
      // But component uses simple keys. Let's align component to use DB structure or map it.
      // DB: trigger_type, action_type, trigger_config
      // Component: trigger, channels (in action_config?), template (in action_config?)

      // For now, let's map DB rows to FE structure
      const rules = (data || []).map(row => ({
        id: row.id,
        name: row.name,
        trigger: row.trigger_type,
        channels: row.action_config?.channels || [],
        delay: row.trigger_config?.delay || 24,
        template: row.action_config?.template || '',
        active: row.is_active,
        user_id: row.user_id
      }));

      setAutomationRules(rules);
    } catch (error) {
      console.error("Error loading automations", error);
      toast({
        title: "Error",
        description: "Failed to load automation rules",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createAutomationRule = async () => {
    if (!user) return;
    if (!newRule.name || !newRule.template || newRule.channels.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const dbPayload = {
        user_id: user.id,
        name: newRule.name,
        trigger_type: newRule.trigger,
        trigger_config: { delay: newRule.delay },
        action_type: 'send_campaign_message', // specific action
        action_config: {
          channels: newRule.channels,
          template: newRule.template
        },
        is_active: newRule.active
      };

      const { data, error } = await supabase
        .from('automations')
        .insert([dbPayload])
        .select()
        .single();

      if (error) throw error;

      const createdRule: AutomationRule = {
        id: data.id,
        name: data.name,
        trigger: data.trigger_type,
        channels: data.action_config.channels,
        delay: data.trigger_config.delay,
        template: data.action_config.template,
        active: data.is_active,
        user_id: data.user_id
      };

      setAutomationRules([createdRule, ...automationRules]);

      setNewRule({
        name: '',
        trigger: 'no_response',
        channels: [],
        delay: 24,
        template: '',
        active: true
      });
      setShowNewRule(false);

      toast({
        title: "Success",
        description: "Automation rule created successfully"
      });
    } catch (error) {
      console.error("Error creating automation", error);
      toast({
        title: "Error",
        description: "Failed to save automation rule",
        variant: "destructive"
      });
    }
  };

  const toggleRule = async (ruleId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('automations')
        .update({ is_active: !currentStatus })
        .eq('id', ruleId);

      if (error) throw error;

      const updatedRules = automationRules.map(rule =>
        rule.id === ruleId
          ? { ...rule, active: !rule.active }
          : rule
      );
      setAutomationRules(updatedRules);

      toast({
        title: "Success",
        description: "Automation rule updated"
      });
    } catch (error) {
      console.error('Error toggling rule:', error);
      toast({
        title: "Error",
        description: "Failed to update rule status",
        variant: "destructive"
      });
    }
  };

  const deleteRule = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from('automations')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      const updatedRules = automationRules.filter(rule => rule.id !== ruleId);
      setAutomationRules(updatedRules);

      toast({
        title: "Success",
        description: "Automation rule deleted"
      });
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast({
        title: "Error",
        description: "Failed to delete rule",
        variant: "destructive"
      });
    }
  };

  const handleChannelToggle = (channel: string) => {
    setNewRule(prev => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel],
      template: prev.channels.includes(channel)
        ? prev.template
        : defaultTemplates[channel] || prev.template
    }));
  };

  useEffect(() => {
    loadAutomationRules();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <FadeIn>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold bg-ai-gradient bg-clip-text text-transparent">
              Campaign Automation
            </h2>
            <p className="text-muted-foreground">
              Set up automated follow-ups and drip campaigns
            </p>
          </div>
          <Button
            onClick={() => setShowNewRule(true)}
            variant="hero"
            className="hover-lift"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Automation Rule
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => {
              toast({
                title: "How Automation Works",
                description: "1. Create a Rule (e.g. 'No Response').\n2. Set a Delay (e.g. 24h).\n3. If condition met, System sends your Template.",
                duration: 6000,
              })
            }}
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-muted-foreground/30">
              <span className="text-xs font-bold text-muted-foreground">?</span>
            </div>
          </Button>
        </div>
      </FadeIn>

      {/* Stats Cards */}
      <FadeIn delay={100}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
              <Zap className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {automationRules.filter(rule => rule.active).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Out of {automationRules.length} total rules
              </p>
            </CardContent>
          </Card>

          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Delay</CardTitle>
              <Clock className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {automationRules.length > 0
                  ? Math.round(automationRules.reduce((sum, rule) => sum + rule.delay, 0) / automationRules.length)
                  : 0}h
              </div>
              <p className="text-xs text-muted-foreground">
                Average follow-up delay
              </p>
            </CardContent>
          </Card>

          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Multi-Channel</CardTitle>
              <Users className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {automationRules.filter(rule => rule.channels.length > 1).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Rules using multiple channels
              </p>
            </CardContent>
          </Card>
        </div>
      </FadeIn>

      {/* New Rule Form */}
      {showNewRule && (
        <FadeIn>
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Create Automation Rule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rule-name">Rule Name</Label>
                  <Input
                    id="rule-name"
                    placeholder="e.g., WhatsApp Follow-up"
                    value={newRule.name}
                    onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trigger">Trigger Event</Label>
                  <Select value={newRule.trigger} onValueChange={(value) => setNewRule(prev => ({ ...prev, trigger: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {triggers.map(trigger => (
                        <SelectItem key={trigger.value} value={trigger.value}>
                          {trigger.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Communication Channels</Label>
                <div className="flex flex-wrap gap-3">
                  {channels.map(channel => {
                    const Icon = channel.icon;
                    const isSelected = newRule.channels.includes(channel.value);

                    return (
                      <div
                        key={channel.value}
                        className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-all hover-lift ${isSelected ? 'border-primary bg-primary/10' : 'border-border'
                          }`}
                        onClick={() => handleChannelToggle(channel.value)}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm">{channel.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delay">Delay (hours)</Label>
                <Input
                  id="delay"
                  type="number"
                  min="1"
                  max="168"
                  value={newRule.delay}
                  onChange={(e) => setNewRule(prev => ({ ...prev, delay: parseInt(e.target.value) || 24 }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template">Message Template</Label>
                <Textarea
                  id="template"
                  placeholder="Use {name}, {college}, etc. for personalization"
                  value={newRule.template}
                  onChange={(e) => setNewRule(prev => ({ ...prev, template: e.target.value }))}
                  rows={4}
                />
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={newRule.active}
                    onCheckedChange={(checked) => setNewRule(prev => ({ ...prev, active: checked }))}
                  />
                  <Label htmlFor="active">Activate immediately</Label>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowNewRule(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createAutomationRule} variant="hero" className="hover-lift">
                    Create Rule
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Automation Rules List */}
      <FadeIn delay={200}>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Automation Rules</h3>
          {automationRules.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No automation rules created yet</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setShowNewRule(true)}
                >
                  Create Your First Rule
                </Button>
              </CardContent>
            </Card>
          ) : (
            automationRules.map((rule, index) => (
              <FadeIn key={rule.id} delay={300 + index * 50}>
                <Card className="hover-scale transition-all duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${rule.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                        <h4 className="font-semibold">{rule.name}</h4>
                        <Badge variant="secondary">
                          {triggers.find(t => t.value === rule.trigger)?.label}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRule(rule.id, rule.active)}
                          className="hover-lift"
                        >
                          {rule.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRule(rule.id)}
                          className="hover-lift text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Channels:</span>
                        <div className="flex gap-1 mt-1">
                          {rule.channels.map(channel => {
                            const channelInfo = channels.find(c => c.value === channel);
                            const Icon = channelInfo?.icon || MessageSquare;
                            return (
                              <Badge key={channel} variant="outline" className="text-xs">
                                <Icon className="w-3 h-3 mr-1" />
                                {channelInfo?.label}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Delay:</span>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          {rule.delay} hours
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>
                        <div className="mt-1">
                          <Badge variant={rule.active ? "default" : "secondary"}>
                            {rule.active ? "Active" : "Paused"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-border/50">
                      <span className="text-muted-foreground text-sm">Template Preview:</span>
                      <p className="text-sm mt-1 line-clamp-2">{rule.template}</p>
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>
            ))
          )}
        </div>
      </FadeIn>
    </div>
  );
};
