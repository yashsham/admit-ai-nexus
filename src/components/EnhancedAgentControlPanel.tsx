import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  Bot,
  MessageSquare,
  Phone,
  Mail,
  Settings,
  RefreshCw,
  Play,
  Pause,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AgentStatus {
  id: string;
  name: string;
  type: 'email' | 'voice' | 'messaging';
  status: 'online' | 'offline' | 'busy' | 'error';
  lastActivity: string;
  metrics: {
    totalProcessed: number;
    successRate: number;
    avgResponseTime: number;
    currentLoad: number;
  };
}

interface CampaignExecution {
  id: string;
  campaignName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  agents: string[];
  startTime: string;
  results?: any;
}

const EnhancedAgentControlPanel = () => {
  const { toast } = useToast();
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [executions, setExecutions] = useState<CampaignExecution[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadData();
    
    // Set up auto-refresh every 10 seconds
    const interval = setInterval(loadData, 10000);
    setRefreshInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        loadCampaigns(),
        loadAgentStatus(),
        loadExecutions()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadCampaigns = async () => {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    setCampaigns(data || []);
  };

  const loadAgentStatus = async () => {
    // Simulate agent status (in production, this would come from real monitoring)
    const mockAgents: AgentStatus[] = [
      {
        id: 'email-agent-001',
        name: 'Email Agent Alpha',
        type: 'email',
        status: 'online',
        lastActivity: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        metrics: {
          totalProcessed: 1247,
          successRate: 94.2,
          avgResponseTime: 1850,
          currentLoad: 15
        }
      },
      {
        id: 'voice-agent-001',
        name: 'Voice Agent Beta',
        type: 'voice',
        status: 'online',
        lastActivity: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        metrics: {
          totalProcessed: 892,
          successRate: 87.6,
          avgResponseTime: 12400,
          currentLoad: 8
        }
      },
      {
        id: 'messaging-agent-001',
        name: 'Messaging Agent Gamma',
        type: 'messaging',
        status: 'online',
        lastActivity: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
        metrics: {
          totalProcessed: 2156,
          successRate: 96.8,
          avgResponseTime: 950,
          currentLoad: 22
        }
      }
    ];

    setAgents(mockAgents);
  };

  const loadExecutions = async () => {
    // Load recent campaign executions from analytics
    const { data, error } = await supabase
      .from('campaign_analytics')
      .select('*')
      .eq('event_type', 'campaign_orchestrated')
      .order('timestamp', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error loading executions:', error);
      return;
    }

    const mockExecutions: CampaignExecution[] = (data || []).map((item, index) => ({
      id: item.id,
      campaignName: `Campaign ${item.campaign_id.slice(0, 8)}`,
      status: index === 0 ? 'running' : index < 3 ? 'completed' : 'pending',
      progress: index === 0 ? 65 : index < 3 ? 100 : 0,
      agents: ['email', 'voice', 'messaging'],
      startTime: item.timestamp,
      results: index < 3 ? item.metadata : undefined
    }));

    setExecutions(mockExecutions);
  };

  const executeMultiChannelCampaign = async (priority: 'low' | 'normal' | 'high' = 'normal') => {
    if (!selectedCampaign) {
      toast({
        title: "No Campaign Selected",
        description: "Please select a campaign to execute",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      console.log('Executing multi-channel campaign with enhanced agents');

      // Execute campaign with enhanced orchestration
      const { data, error } = await supabase.functions.invoke('campaign-orchestrator', {
        body: {
          campaignId: selectedCampaign,
          channels: ['email', 'voice', 'whatsapp'],
          priority,
          agentConfig: {
            email: { priority, retryCount: 3 },
            voice: { priority, voiceSettings: { voice: 'alice', speed: 1.0 } },
            messaging: { priority, messageType: 'whatsapp' }
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Campaign Execution Started",
        description: `Multi-channel campaign launched with ${priority} priority`,
      });

      // Refresh data
      loadData();

    } catch (error) {
      console.error('Error executing campaign:', error);
      toast({
        title: "Execution Failed",
        description: "Failed to start campaign execution",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const executeSpecificAgent = async (agentType: 'email' | 'voice' | 'messaging') => {
    if (!selectedCampaign) {
      toast({
        title: "No Campaign Selected",
        description: "Please select a campaign first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const agentEndpoint = agentType === 'messaging' ? 'whatsapp-agent' : `${agentType}-agent`;
      
      const { data, error } = await supabase.functions.invoke(agentEndpoint, {
        body: {
          campaignId: selectedCampaign,
          priority: 'normal',
          agentId: `${agentType}-agent-manual-${Date.now()}`
        }
      });

      if (error) throw error;

      toast({
        title: "Agent Execution Started",
        description: `${agentType.charAt(0).toUpperCase() + agentType.slice(1)} agent is processing the campaign`,
      });

      loadData();

    } catch (error) {
      console.error(`Error executing ${agentType} agent:`, error);
      toast({
        title: "Agent Execution Failed",
        description: `Failed to start ${agentType} agent`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500/10 text-green-500';
      case 'busy': return 'bg-yellow-500/10 text-yellow-500';
      case 'offline': return 'bg-gray-500/10 text-gray-500';
      case 'error': return 'bg-red-500/10 text-red-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getExecutionStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-500/10 text-blue-500';
      case 'completed': return 'bg-green-500/10 text-green-500';
      case 'failed': return 'bg-red-500/10 text-red-500';
      case 'pending': return 'bg-yellow-500/10 text-yellow-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getAgentIcon = (type: string) => {
    switch (type) {
      case 'email': return Mail;
      case 'voice': return Phone;
      case 'messaging': return MessageSquare;
      default: return Bot;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" />
            Enhanced Agent Control Panel
          </h2>
          <p className="text-muted-foreground">
            Advanced multi-agent coordination and intelligent campaign execution
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadData} variant="outline" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Campaign Selection */}
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Select Campaign</label>
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a campaign to execute" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((campaign: any) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name} ({campaign.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => executeMultiChannelCampaign('high')} 
              disabled={!selectedCampaign || loading}
              variant="hero"
            >
              <Zap className="w-4 h-4 mr-2" />
              Execute All Agents
            </Button>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="agents" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="agents">Agent Status</TabsTrigger>
          <TabsTrigger value="execution">Live Execution</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="coordination">Coordination</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {agents.map((agent) => {
              const IconComponent = getAgentIcon(agent.type);
              return (
                <Card key={agent.id} className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <IconComponent className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{agent.name}</h3>
                        <p className="text-sm text-muted-foreground">{agent.type}</p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(agent.status)}>
                      {agent.status}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Processed</span>
                      <span className="font-semibold">{agent.metrics.totalProcessed}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Success Rate</span>
                      <span className="font-semibold">{agent.metrics.successRate}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Avg Response</span>
                      <span className="font-semibold">{agent.metrics.avgResponseTime}ms</span>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Current Load</span>
                        <span className="font-semibold">{agent.metrics.currentLoad}%</span>
                      </div>
                      <Progress value={agent.metrics.currentLoad} className="h-2" />
                    </div>
                  </div>

                  <Button 
                    onClick={() => executeSpecificAgent(agent.type)} 
                    disabled={!selectedCampaign || loading}
                    className="w-full mt-4"
                    variant="outline"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Execute Agent
                  </Button>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="execution" className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Live Campaign Executions</h3>
            {executions.map((execution) => (
              <Card key={execution.id} className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Activity className="w-5 h-5 text-primary" />
                    <div>
                      <h4 className="font-semibold">{execution.campaignName}</h4>
                      <p className="text-sm text-muted-foreground">
                        Started {new Date(execution.startTime).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <Badge className={getExecutionStatusColor(execution.status)}>
                    {execution.status}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{execution.progress}%</span>
                  </div>
                  <Progress value={execution.progress} className="h-2" />
                  
                  <div className="flex gap-2 mt-3">
                    {execution.agents.map((agent) => {
                      const IconComponent = getAgentIcon(agent);
                      return (
                        <div key={agent} className="flex items-center gap-1 text-xs">
                          <IconComponent className="w-3 h-3" />
                          {agent}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Agent Performance
              </h3>
              <div className="space-y-4">
                {agents.map((agent) => (
                  <div key={agent.id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{agent.name}</span>
                      <span>{agent.metrics.successRate}%</span>
                    </div>
                    <Progress value={agent.metrics.successRate} className="h-2" />
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Response Times
              </h3>
              <div className="space-y-4">
                {agents.map((agent) => (
                  <div key={agent.id} className="flex justify-between">
                    <span className="text-sm">{agent.name}</span>
                    <span className="text-sm font-semibold">
                      {agent.metrics.avgResponseTime}ms
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="coordination" className="space-y-6">
          <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
            <h3 className="text-lg font-semibold mb-4">Agent Coordination Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Priority Mode</label>
                <Select defaultValue="normal">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Priority</SelectItem>
                    <SelectItem value="normal">Normal Priority</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Retry Strategy</label>
                <Select defaultValue="aggressive">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">Conservative</SelectItem>
                    <SelectItem value="balanced">Balanced</SelectItem>
                    <SelectItem value="aggressive">Aggressive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Load Balancing</label>
                <Select defaultValue="auto">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="auto">Automatic</SelectItem>
                    <SelectItem value="intelligent">Intelligent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedAgentControlPanel;