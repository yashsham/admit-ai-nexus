import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Phone, MessageSquare, Play, Pause, Settings, Zap, Users, Clock } from "lucide-react";

interface AgentConfig {
  email: { enabled: boolean; template: string };
  voice: { enabled: boolean; template: string };
  whatsapp: { enabled: boolean; template: string };
  delay_minutes: number;
}

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  candidates_count: number;
  agent_config: AgentConfig | null;
}

interface AgentControlPanelProps {
  campaignId?: string;
}

const AgentControlPanel: React.FC<AgentControlPanelProps> = ({ campaignId }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [agentConfig, setAgentConfig] = useState<AgentConfig>({
    email: { enabled: false, template: '' },
    voice: { enabled: false, template: '' },
    whatsapp: { enabled: false, template: '' },
    delay_minutes: 0
  });
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (campaignId) {
      setSelectedCampaign(campaignId);
      loadCampaignConfig(campaignId);
    }
  }, [campaignId]);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns((data || []) as unknown as Campaign[]);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: "Error",
        description: "Failed to load campaigns",
        variant: "destructive",
      });
    }
  };

  const loadCampaignConfig = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('agent_config')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      if (data?.agent_config) {
        setAgentConfig(data.agent_config as unknown as AgentConfig);
      }
    } catch (error) {
      console.error('Error loading campaign config:', error);
    }
  };

  const updateAgentConfig = async () => {
    if (!selectedCampaign) return;

    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ agent_config: agentConfig as any })
        .eq('id', selectedCampaign);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Agent configuration updated",
      });
    } catch (error) {
      console.error('Error updating config:', error);
      toast({
        title: "Error",
        description: "Failed to update configuration",
        variant: "destructive",
      });
    }
  };

  const executeAgents = async (channels: string[]) => {
    if (!selectedCampaign || channels.length === 0) {
      toast({
        title: "Error",
        description: "Please select a campaign and at least one channel",
        variant: "destructive",
      });
      return;
    }

    setIsExecuting(true);
    setExecutionStatus(null);

    try {
      const { data, error } = await supabase.functions.invoke('campaign-orchestrator', {
        body: {
          campaignId: selectedCampaign,
          channels,
          delay: agentConfig.delay_minutes
        }
      });

      if (error) throw error;

      setExecutionStatus(data.results);
      toast({
        title: "Campaign Executed",
        description: `Successfully processed ${data.results.summary.total} candidates`,
      });
    } catch (error) {
      console.error('Error executing campaign:', error);
      toast({
        title: "Error",
        description: "Failed to execute campaign",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const executeIndividualAgent = async (channel: string) => {
    if (!selectedCampaign) return;

    setIsExecuting(true);

    try {
      const { data, error } = await supabase.functions.invoke(`${channel}-agent`, {
        body: {
          campaignId: selectedCampaign,
          message: (agentConfig[channel as keyof AgentConfig] as { template: string })?.template
        }
      });

      if (error) throw error;

      toast({
        title: `${channel.charAt(0).toUpperCase() + channel.slice(1)} Agent Executed`,
        description: `${data.sent || data.called || 0} messages sent successfully`,
      });
    } catch (error) {
      console.error(`Error executing ${channel} agent:`, error);
      toast({
        title: "Error",
        description: `Failed to execute ${channel} agent`,
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const getEnabledChannels = () => {
    return Object.entries(agentConfig)
      .filter(([key, config]) => key !== 'delay_minutes' && (config as { enabled: boolean }).enabled)
      .map(([key]) => key);
  };

  const selectedCampaignData = campaigns.find(c => c.id === selectedCampaign);

  return (
    <div className="space-y-6">
      {/* Campaign Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Agentic Campaign Control Panel
          </CardTitle>
          <CardDescription>
            Orchestrate multi-channel automated campaigns with AI agents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="campaign-select">Select Campaign</Label>
              <Select value={selectedCampaign} onValueChange={(value) => {
                setSelectedCampaign(value);
                loadCampaignConfig(value);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a campaign" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name} ({campaign.candidates_count} candidates)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedCampaignData && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="text-sm font-medium">{selectedCampaignData.candidates_count} Candidates</span>
                </div>
                <Badge variant={selectedCampaignData.status === 'active' ? 'default' : 'secondary'}>
                  {selectedCampaignData.status}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Agent Configuration */}
      {selectedCampaign && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Email Agent */}
            <Card className={`border-2 ${agentConfig.email.enabled ? 'border-primary' : 'border-muted'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    <CardTitle className="text-lg">Email Agent</CardTitle>
                  </div>
                  <Switch
                    checked={agentConfig.email.enabled}
                    onCheckedChange={(enabled) =>
                      setAgentConfig(prev => ({
                        ...prev,
                        email: { ...prev.email, enabled }
                      }))
                    }
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Email template..."
                  value={agentConfig.email.template}
                  onChange={(e) =>
                    setAgentConfig(prev => ({
                      ...prev,
                      email: { ...prev.email, template: e.target.value }
                    }))
                  }
                  rows={3}
                />
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => executeIndividualAgent('email')}
                  disabled={!agentConfig.email.enabled || isExecuting}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Send Emails
                </Button>
              </CardContent>
            </Card>

            {/* Voice Agent */}
            <Card className={`border-2 ${agentConfig.voice.enabled ? 'border-primary' : 'border-muted'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    <CardTitle className="text-lg">Voice Agent</CardTitle>
                  </div>
                  <Switch
                    checked={agentConfig.voice.enabled}
                    onCheckedChange={(enabled) =>
                      setAgentConfig(prev => ({
                        ...prev,
                        voice: { ...prev.voice, enabled }
                      }))
                    }
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Voice script..."
                  value={agentConfig.voice.template}
                  onChange={(e) =>
                    setAgentConfig(prev => ({
                      ...prev,
                      voice: { ...prev.voice, template: e.target.value }
                    }))
                  }
                  rows={3}
                />
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => executeIndividualAgent('voice')}
                  disabled={!agentConfig.voice.enabled || isExecuting}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Make Calls
                </Button>
              </CardContent>
            </Card>

            {/* WhatsApp Agent */}
            <Card className={`border-2 ${agentConfig.whatsapp.enabled ? 'border-primary' : 'border-muted'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    <CardTitle className="text-lg">WhatsApp Agent</CardTitle>
                  </div>
                  <Switch
                    checked={agentConfig.whatsapp.enabled}
                    onCheckedChange={(enabled) =>
                      setAgentConfig(prev => ({
                        ...prev,
                        whatsapp: { ...prev.whatsapp, enabled }
                      }))
                    }
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="WhatsApp message..."
                  value={agentConfig.whatsapp.template}
                  onChange={(e) =>
                    setAgentConfig(prev => ({
                      ...prev,
                      whatsapp: { ...prev.whatsapp, template: e.target.value }
                    }))
                  }
                  rows={3}
                />
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => executeIndividualAgent('whatsapp')}
                  disabled={!agentConfig.whatsapp.enabled || isExecuting}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Send Messages
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Orchestration Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Campaign Orchestration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="delay">Delay Between Channels (minutes)</Label>
                  <Input
                    id="delay"
                    type="number"
                    min="0"
                    max="1440"
                    value={agentConfig.delay_minutes}
                    onChange={(e) =>
                      setAgentConfig(prev => ({
                        ...prev,
                        delay_minutes: parseInt(e.target.value) || 0
                      }))
                    }
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={updateAgentConfig} variant="outline" className="w-full">
                    Save Configuration
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => executeAgents(getEnabledChannels())}
                  disabled={getEnabledChannels().length === 0 || isExecuting}
                  className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
                >
                  {isExecuting ? (
                    <Pause className="h-4 w-4 mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Execute Full Campaign ({getEnabledChannels().length} channels)
                </Button>
                
                {getEnabledChannels().length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {agentConfig.delay_minutes > 0 && `${agentConfig.delay_minutes}min delay between channels`}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Execution Status */}
          {executionStatus && (
            <Card>
              <CardHeader>
                <CardTitle>Execution Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{executionStatus.summary.success}</div>
                    <div className="text-sm text-muted-foreground">Successful</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{executionStatus.summary.failed}</div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{executionStatus.summary.total}</div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                </div>
                
                <div className="mt-4 space-y-2">
                  {executionStatus.channels.map((channel: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="capitalize">{channel.channel}</span>
                      <Badge variant={channel.status === 'completed' ? 'default' : 'destructive'}>
                        {channel.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default AgentControlPanel;