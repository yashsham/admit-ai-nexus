import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Brain, Target, TrendingUp, Zap, Settings, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DecisionRule {
  id: string;
  condition: string;
  action: string;
  priority: number;
  enabled: boolean;
}

interface CampaignStrategy {
  campaignId: string;
  totalCandidates: number;
  recommendations: any[];
  channelPriority: string[];
  estimatedTimeline: any;
  effectiveness: any;
}

interface MCPInsights {
  insights: string[];
  recommendations: string[];
  performance: any;
}

export function DecisionLogicPanel() {
  const [strategies, setStrategies] = useState<CampaignStrategy[]>([]);
  const [mcpInsights, setMcpInsights] = useState<MCPInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [campaigns, setCampaigns] = useState<any[]>([]);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
      if (data && data.length > 0) {
        setSelectedCampaign(data[0].id);
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
      toast.error('Failed to load campaigns');
    }
  };

  const generateStrategy = async (campaignId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('decision-engine', {
        body: { campaignId, action: 'generate_strategy' }
      });

      if (error) throw error;

      if (data.success) {
        const strategy = data.result;
        setStrategies(prev => {
          const filtered = prev.filter(s => s.campaignId !== campaignId);
          return [...filtered, strategy];
        });
        toast.success('Strategy generated successfully');
      }
    } catch (error) {
      console.error('Error generating strategy:', error);
      toast.error('Failed to generate strategy');
    } finally {
      setLoading(false);
    }
  };

  const analyzeWithMCP = async (campaignId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mcp-server', {
        body: {
          method: 'tools/call',
          params: {
            name: 'analyze_campaign_performance',
            arguments: { campaignId, timeframe: '30d' }
          }
        }
      });

      if (error) throw error;

      if (data.success) {
        setMcpInsights(data.result);
        toast.success('MCP analysis completed');
      }
    } catch (error) {
      console.error('Error with MCP analysis:', error);
      toast.error('Failed to analyze with MCP');
    } finally {
      setLoading(false);
    }
  };

  const optimizeTargeting = async (campaignId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mcp-server', {
        body: {
          method: 'tools/call',
          params: {
            name: 'optimize_candidate_targeting',
            arguments: { campaignId, criteria: {} }
          }
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Targeting optimization completed');
        // Could update UI with optimization results
      }
    } catch (error) {
      console.error('Error optimizing targeting:', error);
      toast.error('Failed to optimize targeting');
    } finally {
      setLoading(false);
    }
  };

  const currentStrategy = strategies.find(s => s.campaignId === selectedCampaign);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Decision Logic & MCP Server</h2>
          <p className="text-muted-foreground">AI-powered campaign optimization and intelligent decision making</p>
        </div>
        <div className="flex gap-2">
          <select 
            value={selectedCampaign} 
            onChange={(e) => setSelectedCampaign(e.target.value)}
            className="px-3 py-2 border rounded-md bg-background"
          >
            {campaigns.map(campaign => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Tabs defaultValue="strategy" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="strategy" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Strategy Engine
          </TabsTrigger>
          <TabsTrigger value="mcp" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            MCP Analysis
          </TabsTrigger>
          <TabsTrigger value="optimization" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Optimization
          </TabsTrigger>
        </TabsList>

        <TabsContent value="strategy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Campaign Strategy Generator
              </CardTitle>
              <CardDescription>
                Generate intelligent campaign strategies using decision logic engine
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button 
                  onClick={() => selectedCampaign && generateStrategy(selectedCampaign)}
                  disabled={loading || !selectedCampaign}
                >
                  {loading ? 'Generating...' : 'Generate Strategy'}
                </Button>
              </div>

              {currentStrategy && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold">{currentStrategy.totalCandidates}</div>
                        <p className="text-sm text-muted-foreground">Total Candidates</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold">{currentStrategy.effectiveness?.expectedConversions || 0}</div>
                        <p className="text-sm text-muted-foreground">Expected Conversions</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold">{currentStrategy.effectiveness?.efficiency || 'N/A'}</div>
                        <p className="text-sm text-muted-foreground">Efficiency Rating</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Channel Priority</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        {currentStrategy.channelPriority.map((channel, index) => (
                          <Badge key={channel} variant={index === 0 ? "default" : "secondary"}>
                            #{index + 1} {channel}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Timeline Phases</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {Object.entries(currentStrategy.estimatedTimeline?.phases || {}).map(([phase, count]) => (
                        <div key={phase} className="flex items-center justify-between">
                          <span className="capitalize">{phase}</span>
                          <div className="flex items-center gap-2">
                            <Progress value={(count as number) / currentStrategy.totalCandidates * 100} className="w-24" />
                            <span className="text-sm text-muted-foreground">{count as number}</span>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mcp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                MCP Server Analysis
              </CardTitle>
              <CardDescription>
                Model Context Protocol powered intelligent analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => selectedCampaign && analyzeWithMCP(selectedCampaign)}
                disabled={loading || !selectedCampaign}
              >
                {loading ? 'Analyzing...' : 'Run MCP Analysis'}
              </Button>

              {mcpInsights && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {mcpInsights.performance && Object.entries(mcpInsights.performance).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center">
                          <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <Badge variant="outline">
                            {typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : String(value)}
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>AI Insights</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {mcpInsights.insights.map((insight, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <BarChart3 className="h-4 w-4 mt-1 text-primary" />
                            <span className="text-sm">{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {mcpInsights.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 mt-1 text-orange-500" />
                            <span className="text-sm">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Campaign Optimization
              </CardTitle>
              <CardDescription>
                Optimize targeting and communication strategies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  onClick={() => selectedCampaign && optimizeTargeting(selectedCampaign)}
                  disabled={loading || !selectedCampaign}
                  variant="outline"
                >
                  Optimize Targeting
                </Button>
                <Button 
                  onClick={() => selectedCampaign && generateStrategy(selectedCampaign)}
                  disabled={loading || !selectedCampaign}
                  variant="outline"
                >
                  Generate Communication Strategy
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Decision Rules</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Email First Priority</div>
                        <div className="text-sm text-muted-foreground">Send email to candidates with email addresses</div>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Voice Follow-up</div>
                        <div className="text-sm text-muted-foreground">Call candidates who don't open emails within 2 days</div>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">WhatsApp Engagement</div>
                        <div className="text-sm text-muted-foreground">Send WhatsApp to engaged candidates</div>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">High Priority Blast</div>
                        <div className="text-sm text-muted-foreground">Multi-channel approach for high-priority candidates</div>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}