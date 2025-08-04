import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings,
  LogOut,
  Bot,
  BarChart3,
  TrendingUp,
  Users,
  Activity,
  Database,
  Brain,
  Zap
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { CampaignAnalytics } from "@/components/CampaignAnalytics";
import AgentAnalyticsDashboard from "@/components/AgentAnalyticsDashboard";
import { SettingsModal } from "@/components/SettingsModal";
import { PaymentModal } from "@/components/PaymentModal";

const AnalyticsDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [showSettings, setShowSettings] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Sign out failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-ai-gradient-subtle">
      {/* Header */}
      <div className="bg-card/50 backdrop-blur-sm border-b border-border/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-ai-gradient rounded-lg flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">AdmitConnect AI</h1>
                <p className="text-xs text-muted-foreground">Analytics Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/admin">
                <Button variant="outline" size="sm">
                  <Users className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => setShowPayment(true)}>
                <TrendingUp className="w-4 h-4 mr-2" />
                Upgrade
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)}>
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">
            Analytics & Intelligence Center 📊
          </h2>
          <p className="text-muted-foreground">
            Deep insights into campaign performance, agent analytics, and AI-driven intelligence.
          </p>
        </div>

        {/* Architecture Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Campaign Analytics</p>
                <p className="text-lg font-semibold">Performance Tracking</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Agent Analytics</p>
                <p className="text-lg font-semibold">Channel Performance</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">AI Intelligence</p>
                <p className="text-lg font-semibold">LLM & Agentic RAG</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data Distribution</p>
                <p className="text-lg font-semibold">Layer Analytics</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Analytics Tabs */}
        <Tabs defaultValue="campaigns" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="campaigns">Campaign Analytics</TabsTrigger>
            <TabsTrigger value="agents">Agent Performance</TabsTrigger>
            <TabsTrigger value="intelligence">AI Intelligence</TabsTrigger>
            <TabsTrigger value="realtime">Real-time Monitoring</TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Campaign Performance Analytics</h3>
              <p className="text-sm text-muted-foreground">
                Comprehensive campaign metrics and insights
              </p>
            </div>
            <CampaignAnalytics />
          </TabsContent>

          <TabsContent value="agents" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Agent Performance Dashboard</h3>
              <p className="text-sm text-muted-foreground">
                Multi-channel agent analytics and performance metrics
              </p>
            </div>
            <AgentAnalyticsDashboard />
          </TabsContent>

          <TabsContent value="intelligence" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">AI Intelligence Center</h3>
              <p className="text-sm text-muted-foreground">
                LLM performance, Agentic RAG insights, and AI decision logic
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
                <div className="flex items-center gap-3 mb-4">
                  <Brain className="w-6 h-6 text-purple-500" />
                  <h4 className="text-lg font-semibold">LLM Performance</h4>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Response Quality</span>
                    <span className="font-semibold">94.2%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Average Response Time</span>
                    <span className="font-semibold">1.8s</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Context Retention</span>
                    <span className="font-semibold">98.7%</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
                <div className="flex items-center gap-3 mb-4">
                  <Zap className="w-6 h-6 text-orange-500" />
                  <h4 className="text-lg font-semibold">Agentic RAG</h4>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Knowledge Retrieval</span>
                    <span className="font-semibold">96.8%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Context Relevance</span>
                    <span className="font-semibold">92.4%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Decision Accuracy</span>
                    <span className="font-semibold">89.6%</span>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
              <div className="flex items-center gap-3 mb-4">
                <Database className="w-6 h-6 text-blue-500" />
                <h4 className="text-lg font-semibold">Decision Logic & MCP Server</h4>
              </div>
              <p className="text-muted-foreground mb-4">
                Intelligent routing and decision-making for automated campaigns and agent coordination.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <Activity className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="font-semibold">Active Decisions</p>
                  <p className="text-2xl font-bold text-green-500">1,247</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <TrendingUp className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <p className="font-semibold">Success Rate</p>
                  <p className="text-2xl font-bold text-blue-500">94.2%</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Zap className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                  <p className="font-semibold">Avg Process Time</p>
                  <p className="text-2xl font-bold text-purple-500">0.3s</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="realtime" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Real-time System Monitoring</h3>
              <p className="text-sm text-muted-foreground">
                Live system performance and agent activity
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
                <div className="flex items-center gap-3 mb-4">
                  <Activity className="w-6 h-6 text-green-500" />
                  <h4 className="text-lg font-semibold">System Health</h4>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Email Agent</span>
                    <span className="text-green-500 text-sm font-semibold">Online</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Voice Agent</span>
                    <span className="text-green-500 text-sm font-semibold">Online</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Messaging Agent</span>
                    <span className="text-green-500 text-sm font-semibold">Online</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">AI Chatbot</span>
                    <span className="text-green-500 text-sm font-semibold">Online</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
                <div className="flex items-center gap-3 mb-4">
                  <BarChart3 className="w-6 h-6 text-blue-500" />
                  <h4 className="text-lg font-semibold">Live Metrics</h4>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Active Campaigns</span>
                    <span className="text-blue-500 text-sm font-semibold">7</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Messages Queued</span>
                    <span className="text-orange-500 text-sm font-semibold">23</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Processing Time</span>
                    <span className="text-green-500 text-sm font-semibold">0.8s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Success Rate</span>
                    <span className="text-green-500 text-sm font-semibold">96.2%</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="w-6 h-6 text-purple-500" />
                  <h4 className="text-lg font-semibold">Recent Activity</h4>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Campaign started</span>
                    <span className="text-muted-foreground">2m ago</span>
                  </div>
                  <div className="flex justify-between">
                    <span>23 emails sent</span>
                    <span className="text-muted-foreground">5m ago</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Voice calls completed</span>
                    <span className="text-muted-foreground">8m ago</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Data sync completed</span>
                    <span className="text-muted-foreground">12m ago</span>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <SettingsModal 
        open={showSettings} 
        onOpenChange={setShowSettings} 
      />

      <PaymentModal 
        open={showPayment} 
        onOpenChange={setShowPayment} 
      />
    </div>
  );
};

export default AnalyticsDashboard;