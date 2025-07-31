import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Download, RefreshCw, TrendingUp, Users, MessageSquare, Phone, Mail } from "lucide-react";

interface AnalyticsData {
  campaign_id: string;
  campaign_name: string;
  event_type: string;
  channel: string;
  status: string;
  count: number;
  timestamp: string;
}

interface ChannelMetrics {
  channel: string;
  sent: number;
  delivered: number;
  opened: number;
  failed: number;
  engagement_rate: number;
}

const AgentAnalyticsDashboard: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [channelMetrics, setChannelMetrics] = useState<ChannelMetrics[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, [selectedTimeRange]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const startDate = getStartDate(selectedTimeRange);
      
      // Fetch campaign analytics
      const { data: analytics, error: analyticsError } = await supabase
        .from('campaign_analytics')
        .select(`
          *,
          campaigns!inner(name)
        `)
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: false });

      if (analyticsError) throw analyticsError;

      // Process analytics data
      const processedData = processAnalyticsData(analytics || []);
      setAnalyticsData(processedData as AnalyticsData[]);

      // Calculate channel metrics
      const channelStats = calculateChannelMetrics(analytics || []);
      setChannelMetrics(channelStats);

      // Generate time series data
      const timeSeriesStats = generateTimeSeriesData(analytics || []);
      setTimeSeriesData(timeSeriesStats);

    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStartDate = (range: string) => {
    const now = new Date();
    switch (range) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  };

  const processAnalyticsData = (data: any[]) => {
    // Group and count events
    const grouped = data.reduce((acc, item) => {
      const key = `${item.campaigns.name}-${item.event_type}-${item.channel}`;
      if (!acc[key]) {
        acc[key] = {
          campaign_id: item.campaign_id,
          campaign_name: item.campaigns.name,
          event_type: item.event_type,
          channel: item.channel,
          status: item.status,
          count: 0,
          timestamp: item.timestamp
        };
      }
      acc[key].count++;
      return acc;
    }, {});

    return Object.values(grouped);
  };

  const calculateChannelMetrics = (data: any[]): ChannelMetrics[] => {
    const channels = ['email', 'voice', 'whatsapp'];
    
    return channels.map(channel => {
      const channelData = data.filter(item => item.channel === channel);
      
      const sent = channelData.filter(item => 
        item.event_type.includes('sent') || item.event_type.includes('initiated')
      ).length;
      
      const delivered = channelData.filter(item => 
        item.status === 'success' && item.event_type.includes('delivered')
      ).length;
      
      const opened = channelData.filter(item => 
        item.event_type.includes('opened') || item.event_type.includes('answered')
      ).length;
      
      const failed = channelData.filter(item => 
        item.event_type.includes('failed') || item.status === 'failed'
      ).length;

      const engagement_rate = sent > 0 ? ((opened / sent) * 100) : 0;

      return {
        channel,
        sent,
        delivered,
        opened,
        failed,
        engagement_rate: Math.round(engagement_rate * 100) / 100
      };
    });
  };

  const generateTimeSeriesData = (data: any[]) => {
    const last7Days = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayData = {
        date: date.toLocaleDateString(),
        email: 0,
        voice: 0,
        whatsapp: 0
      };
      
      data.forEach(item => {
        const itemDate = new Date(item.timestamp);
        if (itemDate.toDateString() === date.toDateString() && item.status === 'success') {
          if (item.channel === 'email') dayData.email++;
          if (item.channel === 'voice') dayData.voice++;
          if (item.channel === 'whatsapp') dayData.whatsapp++;
        }
      });
      
      last7Days.push(dayData);
    }
    
    return last7Days;
  };

  const exportReport = async () => {
    try {
      const csvContent = generateCSVReport();
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agent-analytics-${selectedTimeRange}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Analytics report exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export report",
        variant: "destructive",
      });
    }
  };

  const generateCSVReport = () => {
    const headers = ['Campaign', 'Channel', 'Event Type', 'Status', 'Count', 'Timestamp'];
    const rows = analyticsData.map(item => [
      item.campaign_name,
      item.channel,
      item.event_type,
      item.status,
      item.count,
      item.timestamp
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

  const totalEngagement = channelMetrics.reduce((sum, metric) => sum + metric.opened, 0);
  const totalSent = channelMetrics.reduce((sum, metric) => sum + metric.sent, 0);
  const overallEngagementRate = totalSent > 0 ? ((totalEngagement / totalSent) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Agent Analytics Dashboard</h2>
          <p className="text-muted-foreground">Track engagement across all channels</p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            className="rounded-md border border-input bg-background px-3 py-2"
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <Button onClick={fetchAnalytics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportReport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Sent</p>
              <p className="text-2xl font-bold">{totalSent}</p>
            </div>
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Engagement</p>
              <p className="text-2xl font-bold">{totalEngagement}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Engagement Rate</p>
              <p className="text-2xl font-bold">{overallEngagementRate.toFixed(1)}%</p>
            </div>
            <Users className="h-8 w-8 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Channels</p>
              <p className="text-2xl font-bold">{channelMetrics.filter(m => m.sent > 0).length}</p>
            </div>
            <Mail className="h-8 w-8 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      {/* Channel Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Channel Performance</CardTitle>
            <CardDescription>Messages sent and engagement by channel</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={channelMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="channel" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sent" fill="#8884d8" name="Sent" />
                <Bar dataKey="opened" fill="#82ca9d" name="Engaged" />
                <Bar dataKey="failed" fill="#ff7300" name="Failed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Channel Distribution</CardTitle>
            <CardDescription>Share of total messages by channel</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={channelMetrics.filter(m => m.sent > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ channel, sent }) => `${channel}: ${sent}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="sent"
                >
                  {channelMetrics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Time Series */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Trends</CardTitle>
          <CardDescription>Daily engagement across all channels</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="email" stroke="#8884d8" strokeWidth={2} />
              <Line type="monotone" dataKey="voice" stroke="#82ca9d" strokeWidth={2} />
              <Line type="monotone" dataKey="whatsapp" stroke="#ffc658" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Channel Details */}
      <Card>
        <CardHeader>
          <CardTitle>Channel Details</CardTitle>
          <CardDescription>Detailed performance metrics by channel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {channelMetrics.map((metric) => {
              const IconComponent = metric.channel === 'email' ? Mail : 
                                   metric.channel === 'voice' ? Phone : MessageSquare;
              
              return (
                <div key={metric.channel} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <IconComponent className="h-5 w-5" />
                    <div>
                      <h4 className="font-medium capitalize">{metric.channel}</h4>
                      <p className="text-sm text-muted-foreground">
                        {metric.sent} sent, {metric.opened} engaged
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={metric.engagement_rate > 10 ? 'default' : 'secondary'}>
                      {metric.engagement_rate}% engagement
                    </Badge>
                    {metric.failed > 0 && (
                      <p className="text-sm text-red-600 mt-1">{metric.failed} failed</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentAnalyticsDashboard;