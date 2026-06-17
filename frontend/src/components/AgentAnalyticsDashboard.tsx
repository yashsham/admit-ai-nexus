import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
// import { supabase } from "@/integrations/supabase/client"; // No longer direct DB access
import { api } from "@/lib/api"; // Assuming api wrapper exists or we use axios directly
import axios from "axios"; // Fallback if api wrapper doesn't have it yet
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Download, RefreshCw, TrendingUp, Users, MessageSquare, Phone, Mail } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// New Interfaces matching Backend Response
interface ChannelMetric {
  channel: string;
  sent: number;
  delivered: number;
  failed: number;
  opened: number;
  engagement_rate: number;
}

interface TimeSeriesPoint {
  date: string;
  email: number;
  voice: number;
  whatsapp: number;
}

interface DashboardSummary {
  total_sent: number;
  total_engaged: number;
  engagement_rate: number;
  active_channels: number;
}

interface AgentDashboardData {
  time_series: TimeSeriesPoint[];
  channel_metrics: ChannelMetric[];
  summary: DashboardSummary;
}

const AgentAnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<AgentDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const { toast } = useToast();

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      // Fetch from the new high-performance backend endpoint
      // Adjust the URL to your actual API base URL. Assuming Vite proxy or env var.
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('token') || '';

      const response = await axios.get(`${API_URL}/api/v1/analytics/agent/dashboard`, {
        params: { time_range: selectedTimeRange },
        headers: { Authorization: `Bearer ${token}` }
      });

      setData(response.data);

    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data from backend",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedTimeRange]);

  const exportReport = () => {
    if (!data) return;
    try {
      const csvRows = [
        ['Date', 'Email', 'Voice', 'Whatsapp'],
        ...data.time_series.map(row => [row.date, row.email, row.voice, row.whatsapp])
      ];

      const csvContent = csvRows.map(e => e.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agent-analytics-${selectedTimeRange}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({ title: "Success", description: "Report exported successfully" });
    } catch (e) {
      toast({ title: "Error", description: "Export failed", variant: "destructive" });
    }
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  // Use defaults if data is empty
  const summary = data?.summary || { total_sent: 0, total_engaged: 0, engagement_rate: 0, active_channels: 0 };
  const channelMetrics = data?.channel_metrics || [];
  const timeSeriesData = data?.time_series || [];

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
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
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
              <p className="text-2xl font-bold">{summary.total_sent}</p>
            </div>
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Engaged</p>
              <p className="text-2xl font-bold">{summary.total_engaged}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Engagement Rate</p>
              <p className="text-2xl font-bold">{summary.engagement_rate.toFixed(1)}%</p>
            </div>
            <Users className="h-8 w-8 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Channels</p>
              <p className="text-2xl font-bold">{summary.active_channels}</p>
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
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="channel" capitalize />
                <YAxis />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend />
                <Bar dataKey="sent" fill="#8884d8" name="Sent" radius={[4, 4, 0, 0]} />
                <Bar dataKey="opened" fill="#82ca9d" name="Engaged" radius={[4, 4, 0, 0]} />
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
          <CardDescription>Daily activity across all channels</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Legend />
              <Line type="monotone" dataKey="email" stroke="#8884d8" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="voice" stroke="#82ca9d" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="whatsapp" stroke="#ffc658" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Channel Details Table */}
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
                <div key={metric.channel} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${metric.channel === 'email' ? 'bg-blue-100 text-blue-600' : metric.channel === 'whatsapp' ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'}`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium capitalize">{metric.channel}</h4>
                      <p className="text-sm text-muted-foreground">
                        {metric.sent} sent, {metric.opened} engaged
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={metric.engagement_rate > 10 ? 'default' : 'secondary'}>
                      {metric.engagement_rate.toFixed(1)}% engagement
                    </Badge>
                    {metric.failed > 0 && (
                      <p className="text-sm text-red-600 mt-1">{metric.failed} failed</p>
                    )}
                  </div>
                </div>
              );
            })}
            {channelMetrics.length === 0 && <div className="text-center text-muted-foreground py-4">No channel data available</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentAnalyticsDashboard;