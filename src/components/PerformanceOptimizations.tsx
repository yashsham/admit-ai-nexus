import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Zap, 
  Database, 
  Clock, 
  BarChart3, 
  TrendingUp,
  Cpu,
  HardDrive,
  Globe,
  RefreshCw
} from 'lucide-react';

interface PerformanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  apiResponseTime: number;
  databaseConnections: number;
  cacheHitRate: number;
  activeUsers: number;
  throughput: number;
  errorRate: number;
}

interface OptimizationRule {
  id: string;
  name: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  enabled: boolean;
  lastApplied: string;
}

const PerformanceOptimizations = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    cpuUsage: 45,
    memoryUsage: 62,
    apiResponseTime: 235,
    databaseConnections: 12,
    cacheHitRate: 85,
    activeUsers: 147,
    throughput: 324,
    errorRate: 0.8
  });

  const [optimizations, setOptimizations] = useState<OptimizationRule[]>([
    {
      id: 'query-caching',
      name: 'Database Query Caching',
      description: 'Cache frequently accessed database queries to reduce load',
      impact: 'high',
      enabled: true,
      lastApplied: '2024-01-10T10:30:00Z'
    },
    {
      id: 'connection-pooling',
      name: 'Connection Pooling',
      description: 'Optimize database connection management',
      impact: 'high',
      enabled: true,
      lastApplied: '2024-01-10T09:15:00Z'
    },
    {
      id: 'batch-processing',
      name: 'Batch Processing',
      description: 'Group similar operations for better efficiency',
      impact: 'medium',
      enabled: true,
      lastApplied: '2024-01-10T08:45:00Z'
    },
    {
      id: 'cdn-optimization',
      name: 'CDN Optimization',
      description: 'Optimize content delivery network usage',
      impact: 'medium',
      enabled: false,
      lastApplied: '2024-01-09T16:20:00Z'
    }
  ]);

  const [isOptimizing, setIsOptimizing] = useState(false);

  // Simulate real-time metrics updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        cpuUsage: Math.max(0, Math.min(100, prev.cpuUsage + (Math.random() - 0.5) * 10)),
        memoryUsage: Math.max(0, Math.min(100, prev.memoryUsage + (Math.random() - 0.5) * 8)),
        apiResponseTime: Math.max(50, prev.apiResponseTime + (Math.random() - 0.5) * 50),
        databaseConnections: Math.max(0, Math.min(50, prev.databaseConnections + Math.floor((Math.random() - 0.5) * 5))),
        cacheHitRate: Math.max(0, Math.min(100, prev.cacheHitRate + (Math.random() - 0.5) * 5)),
        activeUsers: Math.max(0, prev.activeUsers + Math.floor((Math.random() - 0.5) * 10)),
        throughput: Math.max(0, prev.throughput + (Math.random() - 0.5) * 100),
        errorRate: Math.max(0, Math.min(10, prev.errorRate + (Math.random() - 0.5) * 0.5))
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const toggleOptimization = useCallback((id: string) => {
    setOptimizations(prev => 
      prev.map(opt => 
        opt.id === id 
          ? { ...opt, enabled: !opt.enabled, lastApplied: new Date().toISOString() }
          : opt
      )
    );
  }, []);

  const runOptimization = useCallback(async () => {
    setIsOptimizing(true);
    
    // Simulate optimization process
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Apply optimizations
    setMetrics(prev => ({
      ...prev,
      cpuUsage: Math.max(20, prev.cpuUsage * 0.8),
      memoryUsage: Math.max(30, prev.memoryUsage * 0.9),
      apiResponseTime: Math.max(100, prev.apiResponseTime * 0.7),
      cacheHitRate: Math.min(100, prev.cacheHitRate * 1.1),
      errorRate: prev.errorRate * 0.5
    }));
    
    setIsOptimizing(false);
  }, []);

  const performanceScore = useMemo(() => {
    const scores = [
      (100 - metrics.cpuUsage),
      (100 - metrics.memoryUsage),
      Math.max(0, 100 - (metrics.apiResponseTime - 100) / 10),
      metrics.cacheHitRate,
      Math.max(0, 100 - metrics.errorRate * 10)
    ];
    
    return Math.round(scores.reduce((a, b) => a + b) / scores.length);
  }, [metrics]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Performance Optimization</h2>
          <p className="text-muted-foreground">Monitor and optimize system performance</p>
        </div>
        <Button 
          onClick={runOptimization}
          disabled={isOptimizing}
          className="gap-2"
        >
          {isOptimizing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          {isOptimizing ? 'Optimizing...' : 'Run Optimization'}
        </Button>
      </div>

      {/* Performance Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Overall Performance Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className={`text-4xl font-bold ${getScoreColor(performanceScore)}`}>
              {performanceScore}%
            </div>
            <Progress value={performanceScore} className="flex-1" />
            <Badge variant={performanceScore >= 80 ? 'default' : performanceScore >= 60 ? 'secondary' : 'destructive'}>
              {performanceScore >= 80 ? 'Excellent' : performanceScore >= 60 ? 'Good' : 'Needs Attention'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="metrics">Real-time Metrics</TabsTrigger>
          <TabsTrigger value="optimizations">Optimization Rules</TabsTrigger>
          <TabsTrigger value="alerts">Performance Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.cpuUsage.toFixed(1)}%</div>
                <Progress value={metrics.cpuUsage} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.memoryUsage.toFixed(1)}%</div>
                <Progress value={metrics.memoryUsage} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Response</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.apiResponseTime.toFixed(0)}ms</div>
                <p className="text-xs text-muted-foreground mt-1">Average response time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.cacheHitRate.toFixed(1)}%</div>
                <Progress value={metrics.cacheHitRate} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.activeUsers}</div>
                <p className="text-xs text-muted-foreground mt-1">Currently online</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Throughput</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.throughput.toFixed(0)}</div>
                <p className="text-xs text-muted-foreground mt-1">Requests per minute</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">DB Connections</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.databaseConnections}</div>
                <p className="text-xs text-muted-foreground mt-1">Active connections</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.errorRate.toFixed(2)}%</div>
                <p className="text-xs text-muted-foreground mt-1">Error percentage</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="optimizations" className="space-y-4">
          <div className="grid gap-4">
            {optimizations.map((opt) => (
              <Card key={opt.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{opt.name}</CardTitle>
                      <CardDescription>{opt.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getImpactColor(opt.impact)}>
                        {opt.impact} impact
                      </Badge>
                      <Button
                        size="sm"
                        variant={opt.enabled ? "default" : "outline"}
                        onClick={() => toggleOptimization(opt.id)}
                      >
                        {opt.enabled ? 'Enabled' : 'Disabled'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Last applied: {new Date(opt.lastApplied).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="space-y-4">
            {metrics.cpuUsage > 80 && (
              <Alert>
                <Activity className="h-4 w-4" />
                <AlertDescription>
                  High CPU usage detected ({metrics.cpuUsage.toFixed(1)}%). Consider enabling CPU optimization rules.
                </AlertDescription>
              </Alert>
            )}
            
            {metrics.apiResponseTime > 500 && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  API response time is above threshold ({metrics.apiResponseTime.toFixed(0)}ms). Enable caching optimizations.
                </AlertDescription>
              </Alert>
            )}
            
            {metrics.cacheHitRate < 70 && (
              <Alert>
                <Database className="h-4 w-4" />
                <AlertDescription>
                  Low cache hit rate ({metrics.cacheHitRate.toFixed(1)}%). Review caching strategy.
                </AlertDescription>
              </Alert>
            )}
            
            {metrics.errorRate > 2 && (
              <Alert>
                <Globe className="h-4 w-4" />
                <AlertDescription>
                  High error rate detected ({metrics.errorRate.toFixed(2)}%). Check system logs for issues.
                </AlertDescription>
              </Alert>
            )}
            
            {metrics.cpuUsage <= 80 && metrics.apiResponseTime <= 500 && metrics.cacheHitRate >= 70 && metrics.errorRate <= 2 && (
              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertDescription>
                  All systems operating within normal parameters. No alerts at this time.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceOptimizations;