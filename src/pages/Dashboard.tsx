import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  Phone,
  MessageSquare,
  BarChart3,
  Users,
  Clock,
  TrendingUp,
  FileText,
  Play,
  Pause,
  Settings,
  Bell,
  User,
  LogOut,
  Bot,
  Plus,
  Zap
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UploadCandidates } from "@/components/UploadCandidates";
import { CampaignCreator } from "@/components/CampaignCreator";
import { AIChat } from "@/components/AIChat";
import { SettingsModal } from "@/components/SettingsModal";
import { CampaignCard } from "@/components/CampaignCard";
import { PaymentModal } from "@/components/PaymentModal";
import { CampaignAnalytics } from "@/components/CampaignAnalytics";
import { CampaignAutomation } from "@/components/CampaignAutomation";
import { NotificationCenter } from "@/components/NotificationCenter";
import { CampaignExecutor } from "@/components/CampaignExecutor";
import { CollegeCounselingCrew } from "@/components/CollegeCounselingCrew";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    messagesSent: 0,
    callsMade: 0,
    responseRate: 0
  });

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      // Load campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (campaignsError) throw campaignsError;

      setCampaigns(campaignsData || []);

      // Calculate stats
      const totalCampaigns = campaignsData?.length || 0;
      const messagesSent = campaignsData?.reduce((sum, campaign) => sum + (campaign.messages_sent || 0), 0) || 0;
      const callsMade = campaignsData?.reduce((sum, campaign) => sum + (campaign.calls_made || 0), 0) || 0;
      const responsesReceived = campaignsData?.reduce((sum, campaign) => sum + (campaign.responses_received || 0), 0) || 0;
      const totalContacts = messagesSent + callsMade;
      const responseRate = totalContacts > 0 ? Math.round((responsesReceived / totalContacts) * 100) : 0;

      setStats({
        totalCampaigns,
        messagesSent,
        callsMade,
        responseRate
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error loading data",
        description: "Failed to load dashboard data. Please refresh the page.",
        variant: "destructive",
      });
    }
  };

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
                <p className="text-xs text-muted-foreground">Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
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
            Welcome back, {user?.user_metadata?.full_name || user?.email}! 👋
          </h2>
          <p className="text-muted-foreground">
            Manage your admission campaigns and track performance from your dashboard.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Campaigns</p>
                <p className="text-2xl font-bold">{stats.totalCampaigns}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Messages Sent</p>
                <p className="text-2xl font-bold">{stats.messagesSent}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Phone className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Calls Made</p>
                <p className="text-2xl font-bold">{stats.callsMade}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Response Rate</p>
                <p className="text-2xl font-bold">{stats.responseRate}%</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="ai-crew">AI Crew</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="automation">Automation</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Recent Campaigns */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Recent Campaigns</h3>
                  <Button onClick={() => setActiveDialog('create-campaign')} variant="hero">
                    <Plus className="w-4 h-4 mr-2" />
                    New Campaign
                  </Button>
                </div>

                {campaigns.length === 0 ? (
                  <Card className="p-8 text-center bg-card/50 backdrop-blur-sm border-border/50">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first campaign to start reaching prospective students.
                    </p>
                    <Button onClick={() => setActiveDialog('create-campaign')} variant="hero">
                      Create Your First Campaign
                    </Button>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {campaigns.slice(0, 3).map((campaign) => (
                      <CampaignCard
                        key={campaign.id}
                        campaign={campaign}
                        onUpdate={loadDashboardData}
                      />
                    ))}
                    {campaigns.length > 3 && (
                      <Card className="p-4 text-center bg-card/50 backdrop-blur-sm border-border/50">
                        <p className="text-muted-foreground">+{campaigns.length - 3} more campaigns</p>
                        <Button variant="ghost" size="sm" className="mt-2">View All Campaigns</Button>
                      </Card>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column - AI Chat & Quick Actions */}
              <div className="space-y-6">
                <AIChat />

                <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" />
                    Quick Actions
                  </h3>
                  <div className="space-y-3">
                     <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => setActiveDialog('upload-candidates')}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Candidates
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => setActiveDialog('create-campaign')}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Campaign
                    </Button>
                    {campaigns.length > 0 && (
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => setActiveDialog('execute-campaign')}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Execute Campaign
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => setShowPayment(true)}
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Upgrade Plan
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">All Campaigns</h3>
              <Button onClick={() => setActiveDialog('create-campaign')} variant="hero">
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </div>
            
            {campaigns.length === 0 ? (
              <Card className="p-8 text-center bg-card/50 backdrop-blur-sm border-border/50">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first campaign to start reaching prospective students.
                </p>
                <Button onClick={() => setActiveDialog('create-campaign')} variant="hero">
                  Create Your First Campaign
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {campaigns.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    onUpdate={loadDashboardData}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ai-crew">
            <CollegeCounselingCrew />
          </TabsContent>

          <TabsContent value="analytics">
            <CampaignAnalytics />
          </TabsContent>

          <TabsContent value="automation">
            <CampaignAutomation />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationCenter />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <Dialog 
        open={activeDialog === 'create-campaign'} 
        onOpenChange={(open) => !open && setActiveDialog(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Campaign</DialogTitle>
          </DialogHeader>
          <CampaignCreator 
            onCampaignCreated={() => {
              setActiveDialog(null);
              loadDashboardData();
            }} 
          />
        </DialogContent>
      </Dialog>

      <Dialog 
        open={activeDialog === 'upload-candidates'} 
        onOpenChange={(open) => !open && setActiveDialog(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Candidates</DialogTitle>
          </DialogHeader>
          <UploadCandidates 
            onUploadComplete={() => {
              setActiveDialog(null);
              loadDashboardData();
            }} 
          />
        </DialogContent>
      </Dialog>

      <Dialog 
        open={activeDialog === 'execute-campaign'} 
        onOpenChange={(open) => !open && setActiveDialog(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Execute Campaign</DialogTitle>
          </DialogHeader>
          {campaigns.length > 0 && (
            <CampaignExecutor 
              campaign={campaigns[0]}
              onExecutionComplete={() => {
                setActiveDialog(null);
                loadDashboardData();
                toast({
                  title: "Campaign Executed",
                  description: "Your campaign is now running across selected channels"
                });
              }} 
            />
          )}
        </DialogContent>
      </Dialog>

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

export default Dashboard;