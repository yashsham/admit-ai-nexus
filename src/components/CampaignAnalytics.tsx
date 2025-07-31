import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import { 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Phone, 
  Target,
  Download,
  RefreshCw,
  Activity
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { FadeIn } from "@/components/ui/scroll-reveal";

interface CampaignMetrics {
  totalCampaigns: number;
  activeCampaigns: number;
  totalCandidates: number;
  messagesSent: number;
  callsMade: number;
  responsesReceived: number;
  conversionRate: number;
}

interface CampaignData {
  id: string;
  name: string;
  status: string;
  type: string;
  candidates_count: number;
  messages_sent: number;
  calls_made: number;
  responses_received: number;
  created_at: string;
}

interface AnalyticsData {
  name: string;
  messages: number;
  calls: number;
  responses: number;
  conversion: number;
}

export const CampaignAnalytics = () => {
  const [metrics, setMetrics] = useState<CampaignMetrics | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch campaigns data
      const { data: campaignsData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (campaignError) throw campaignError;

      setCampaigns(campaignsData || []);

      // Calculate metrics
      const totalCampaigns = campaignsData?.length || 0;
      const activeCampaigns = campaignsData?.filter(c => c.status === 'active').length || 0;
      const totalCandidates = campaignsData?.reduce((sum, c) => sum + (c.candidates_count || 0), 0) || 0;
      const messagesSent = campaignsData?.reduce((sum, c) => sum + (c.messages_sent || 0), 0) || 0;
      const callsMade = campaignsData?.reduce((sum, c) => sum + (c.calls_made || 0), 0) || 0;
      const responsesReceived = campaignsData?.reduce((sum, c) => sum + (c.responses_received || 0), 0) || 0;
      const conversionRate = totalCandidates > 0 ? (responsesReceived / totalCandidates) * 100 : 0;

      setMetrics({
        totalCampaigns,
        activeCampaigns,
        totalCandidates,
        messagesSent,
        callsMade,
        responsesReceived,
        conversionRate
      });

      // Prepare analytics chart data
      const chartData = campaignsData?.slice(0, 6).map(campaign => ({
        name: campaign.name.substring(0, 15) + (campaign.name.length > 15 ? '...' : ''),
        messages: campaign.messages_sent || 0,
        calls: campaign.calls_made || 0,
        responses: campaign.responses_received || 0,
        conversion: campaign.candidates_count > 0 ? 
          ((campaign.responses_received || 0) / campaign.candidates_count) * 100 : 0
      })) || [];

      setAnalyticsData(chartData);

    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    const csvContent = [
      ['Campaign Name', 'Status', 'Type', 'Candidates', 'Messages Sent', 'Calls Made', 'Responses', 'Conversion Rate'],
      ...campaigns.map(campaign => [
        campaign.name,
        campaign.status,
        campaign.type,
        campaign.candidates_count || 0,
        campaign.messages_sent || 0,
        campaign.calls_made || 0,
        campaign.responses_received || 0,
        campaign.candidates_count > 0 ? 
          `${(((campaign.responses_received || 0) / campaign.candidates_count) * 100).toFixed(2)}%` : '0%'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Analytics report exported successfully",
    });
  };

  useEffect(() => {
    fetchAnalytics();

    // Set up real-time updates
    const channel = supabase
      .channel('analytics-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaigns'
        },
        () => {
          fetchAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  const pieData = [
    { name: 'Messages Sent', value: metrics?.messagesSent || 0, color: CHART_COLORS[0] },
    { name: 'Calls Made', value: metrics?.callsMade || 0, color: CHART_COLORS[1] },
    { name: 'Responses', value: metrics?.responsesReceived || 0, color: CHART_COLORS[2] },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <FadeIn>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold bg-ai-gradient bg-clip-text text-transparent">
              Campaign Analytics
            </h2>
            <p className="text-muted-foreground">
              Real-time insights into your outreach performance
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchAnalytics}
              disabled={loading}
              className="hover-lift"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="hero"
              onClick={exportReport}
              className="hover-lift"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </FadeIn>

      {/* Key Metrics Cards */}
      <FadeIn delay={100}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover-lift transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.totalCampaigns || 0}</div>
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  {metrics?.activeCampaigns || 0} Active
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-lift transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.totalCandidates || 0}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Across all campaigns
              </p>
            </CardContent>
          </Card>

          <Card className="hover-lift transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages & Calls</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(metrics?.messagesSent || 0) + (metrics?.callsMade || 0)}
              </div>
              <div className="flex items-center space-x-2 mt-1">
                <MessageSquare className="h-3 w-3 text-primary" />
                <span className="text-xs">{metrics?.messagesSent || 0}</span>
                <Phone className="h-3 w-3 text-secondary" />
                <span className="text-xs">{metrics?.callsMade || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-lift transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics?.conversionRate.toFixed(1) || 0}%
              </div>
              <Progress value={metrics?.conversionRate || 0} className="mt-2" />
            </CardContent>
          </Card>
        </div>
      </FadeIn>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <FadeIn delay={200}>
          <Card className="hover-scale transition-all duration-300">
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="messages" fill={CHART_COLORS[0]} name="Messages" />
                  <Bar dataKey="calls" fill={CHART_COLORS[1]} name="Calls" />
                  <Bar dataKey="responses" fill={CHART_COLORS[2]} name="Responses" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Pie Chart */}
        <FadeIn delay={300}>
          <Card className="hover-scale transition-all duration-300">
            <CardHeader>
              <CardTitle>Outreach Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {/* Conversion Rate Trend */}
      <FadeIn delay={400}>
        <Card className="hover-scale transition-all duration-300">
          <CardHeader>
            <CardTitle>Conversion Rate by Campaign</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value}%`, 'Conversion Rate']} />
                <Line 
                  type="monotone" 
                  dataKey="conversion" 
                  stroke={CHART_COLORS[0]} 
                  strokeWidth={3}
                  dot={{ fill: CHART_COLORS[0], strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
};