import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  AreaChart,
  Area,
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
  Activity,
  Filter
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { FadeIn } from "@/components/ui/scroll-reveal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";

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
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("all");
  const { toast } = useToast();

  const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // 1. Fetch campaigns list for the selector
      const { data: campaignsData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (campaignError) throw campaignError;
      setCampaigns(campaignsData || []);

      // 2. Fetch deep analytics from Python Backend, optionally filtered
      // We pass the selectedCampaignId if it's not "all"
      const backendMetrics = await api.analytics.get(selectedCampaignId === "all" ? undefined : selectedCampaignId);

      // 3. Process Data
      const totalCampaigns = campaignsData?.length || 0;

      // Filter local campaigns data if a specific one is selected for the charts
      const filteredCampaigns = selectedCampaignId === "all"
        ? campaignsData
        : campaignsData?.filter(c => c.id === selectedCampaignId);

      const messagesSent = backendMetrics.overview?.total_sent || 0;

      setMetrics({
        totalCampaigns: selectedCampaignId === "all" ? totalCampaigns : 1,
        activeCampaigns: backendMetrics.overview?.active_campaigns || 0,
        totalCandidates: filteredCampaigns?.reduce((sum, c) => sum + (c.candidates_count || 0), 0) || 0,
        messagesSent,
        callsMade: 0,
        responsesReceived: 0,
        conversionRate: backendMetrics.overview?.delivery_rate || 0
      });

      // Prepare analytics chart data
      // If "all", show top campaigns. If "selected", maybe show time-series if available?
      // For now, simpler: If selected, just show that single campaign's stats as a single bar/point or similar logic
      // But actually, the previous logic mapped *campaigns* to bars. 
      // If we select one, we might want to see breakdown by something else, or just that one bar compared to others?
      // Let's stick to showing the filtered list.

      const chartData = filteredCampaigns?.slice(0, 7).map(campaign => ({
        name: campaign.name.substring(0, 15) + (campaign.name.length > 15 ? '...' : ''),
        messages: campaign.messages_sent || 0,
        calls: campaign.calls_made || 0,
        responses: campaign.responses_received || 0,
        conversion: ((campaign.responses_received || 0) / (campaign.messages_sent || 1)) * 100
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

  useEffect(() => {
    fetchAnalytics();
  }, [selectedCampaignId]); // Re-fetch when selection changes

  // Subscribe to Realtime Updates
  useEffect(() => {
    // Channel for "campaign_executions" insert/update
    const channel = supabase
      .channel('analytics-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campaign_executions' },
        (payload) => {
          console.log('Realtime Update:', payload);
          // Simple approach: re-fetch analytics to get aggregated stats
          // Optimistic update is harder with aggregated Supabase queries, so we just trigger re-fetch
          fetchAnalytics();
          toast({
            title: "New Activity",
            description: "Campaign data updated",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const exportReport = async () => {
    try {
      toast({ title: "Generating PDF", description: "Please wait..." });
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      // Select the element to capture (e.g. the chart container or whole page)
      // We will capture a specific ID or document.body implementation
      // Let's assume we wrap the content in a div with id "analytics-dashboard"
      const element = document.getElementById('analytics-dashboard');
      if (!element) throw new Error("Dashboard element not found");

      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.setFontSize(16);
      pdf.text("Admit AI - Campaign Analytics Report", 10, 10);
      pdf.addImage(imgData, 'PNG', 0, 20, pdfWidth, pdfHeight);

      pdf.save(`analytics_report_${new Date().toISOString().split('T')[0]}.pdf`);

      toast({ title: "Success", description: "Report downloaded!" });
    } catch (e) {
      console.error("Export failed", e);
      toast({ title: "Export Failed", description: "Could not generate PDF", variant: "destructive" });
    }
  };

  // Modern Chart Gradients
  const GradientDefs = () => (
    <defs>
      <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.8} />
        <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
      </linearGradient>
      <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor={CHART_COLORS[1]} stopOpacity={0.8} />
        <stop offset="95%" stopColor={CHART_COLORS[1]} stopOpacity={0} />
      </linearGradient>
    </defs>
  );

  const pieData = [
    { name: 'Messages Sent', value: metrics?.messagesSent || 0, color: CHART_COLORS[0] },
    { name: 'Calls Made', value: metrics?.callsMade || 0, color: CHART_COLORS[1] },
    { name: 'Responses', value: metrics?.responsesReceived || 0, color: CHART_COLORS[2] },
  ];

  if (loading && !metrics) {
    // Only full page load on first fetch
    return <div className="p-8"><LoadingSpinner /></div>;
  }

  return (
    <div id="analytics-dashboard" className="space-y-6">
      {/* Header */}
      <FadeIn>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold bg-ai-gradient bg-clip-text text-transparent">
              Campaign Analytics
            </h2>
            <p className="text-muted-foreground">
              Deep insights into your {selectedCampaignId === 'all' ? 'global' : 'campaign'} performance
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">

            {/* Campaign Selector */}
            <div className="w-[200px]">
              <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="All Campaigns" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  {campaigns.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              onClick={fetchAnalytics}
              disabled={loading}
              className="hover-lift"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="hero"
              onClick={exportReport}
              className="hover-lift"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </FadeIn>

      {/* Key Metrics Cards */}
      <FadeIn delay={100}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover-lift transition-all duration-200 border-t-4 border-t-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {selectedCampaignId === 'all' ? 'Total Campaigns' : 'Campaign Status'}
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {selectedCampaignId === 'all' ? metrics?.totalCampaigns : (
                  <span className="capitalize">{campaigns.find(c => c.id === selectedCampaignId)?.status || 'Active'}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {selectedCampaignId === 'all' ? `${metrics?.activeCampaigns} Active currently` : 'Current Status'}
              </p>
            </CardContent>
          </Card>

          <Card className="hover-lift transition-all duration-200 border-t-4 border-t-secondary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Candidates Reached</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.totalCandidates || 0}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Target audience size
              </p>
            </CardContent>
          </Card>

          <Card className="hover-lift transition-all duration-200 border-t-4 border-t-accent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Engagement</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(metrics?.messagesSent || 0) + (metrics?.callsMade || 0)}
              </div>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline" className="text-xs font-normal">
                  {metrics?.messagesSent || 0} Msgs
                </Badge>
                <Badge variant="outline" className="text-xs font-normal">
                  {metrics?.callsMade || 0} Calls
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-lift transition-all duration-200 border-t-4 border-t-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics?.conversionRate.toFixed(1) || 0}%
              </div>
              <Progress value={metrics?.conversionRate || 0} className="mt-2 h-1" />
            </CardContent>
          </Card>
        </div>
      </FadeIn>

      {/* Modern Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Area Chart with Gradient */}
        <FadeIn delay={200}>
          <Card className="hover-scale transition-all duration-300">
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analyticsData}>
                  <GradientDefs />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
                  <YAxis />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="messages"
                    stroke={CHART_COLORS[0]}
                    fillOpacity={1}
                    fill="url(#colorMessages)"
                    name="Messages"
                  />
                  <Area
                    type="monotone"
                    dataKey="calls"
                    stroke={CHART_COLORS[1]}
                    fillOpacity={1}
                    fill="url(#colorCalls)"
                    name="Calls"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Improved Pie Chart */}
        <FadeIn delay={300}>
          <Card className="hover-scale transition-all duration-300">
            <CardHeader>
              <CardTitle>Channel Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip />
                  {/* Custom Legend if needed, or rely on Tooltip */}
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-4">
                {pieData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                    <span className="text-sm text-muted-foreground">{entry.name} ({entry.value})</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>

    </div>
  );
};