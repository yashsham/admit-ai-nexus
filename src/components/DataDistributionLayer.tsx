import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Database,
  Users,
  FileText,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Download,
  Upload,
  Filter,
  Search,
  ArrowRight,
  Activity
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CandidateData {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  course: string;
  status: string;
  campaign_id: string;
  created_at: string;
  updated_at: string;
  email_sent?: boolean;
  voice_called?: boolean;
  whatsapp_sent?: boolean;
  response_received?: boolean;
}

interface DistributionStats {
  totalCandidates: number;
  readyForDistribution: number;
  inProgress: number;
  completed: number;
  failed: number;
}

const DataDistributionLayer = () => {
  const { toast } = useToast();
  const [candidates, setCandidates] = useState<CandidateData[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<CandidateData[]>([]);
  const [stats, setStats] = useState<DistributionStats>({
    totalCandidates: 0,
    readyForDistribution: 0,
    inProgress: 0,
    completed: 0,
    failed: 0
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDistributing, setIsDistributing] = useState(false);

  useEffect(() => {
    loadCandidateData();
  }, []);

  useEffect(() => {
    filterCandidates();
  }, [candidates, searchTerm, statusFilter]);

  const loadCandidateData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select(`
          *,
          campaigns(name, type, status)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCandidates(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error loading candidate data:', error);
      toast({
        title: "Error",
        description: "Failed to load candidate data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: CandidateData[]) => {
    const totalCandidates = data.length;
    const readyForDistribution = data.filter(c => c.status === 'pending').length;
    const inProgress = data.filter(c => 
      c.status === 'email_sent' || c.status === 'voice_called' || c.status === 'whatsapp_sent'
    ).length;
    const completed = data.filter(c => c.response_received).length;
    const failed = data.filter(c => c.status === 'failed').length;

    setStats({
      totalCandidates,
      readyForDistribution,
      inProgress,
      completed,
      failed
    });
  };

  const filterCandidates = () => {
    let filtered = candidates;

    if (searchTerm) {
      filtered = filtered.filter(candidate =>
        candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.phone.includes(searchTerm) ||
        candidate.city.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(candidate => candidate.status === statusFilter);
    }

    setFilteredCandidates(filtered);
  };

  const distributeToAgents = async (candidateIds: string[], channels: string[]) => {
    setIsDistributing(true);
    try {
      const results = [];
      
      for (const channel of channels) {
        let endpoint = '';
        switch (channel) {
          case 'email':
            endpoint = 'email-agent';
            break;
          case 'voice':
            endpoint = 'voice-agent';
            break;
          case 'whatsapp':
            endpoint = 'whatsapp-agent';
            break;
          default:
            continue;
        }

        const { data, error } = await supabase.functions.invoke(endpoint, {
          body: {
            candidateIds,
            distributedBy: 'data-distribution-layer'
          }
        });

        if (error) throw error;
        results.push({ channel, success: true, data });
      }

      toast({
        title: "Distribution Complete",
        description: `Successfully distributed data to ${channels.length} channels`,
      });

      loadCandidateData();
    } catch (error) {
      console.error('Error distributing data:', error);
      toast({
        title: "Distribution Failed",
        description: "Failed to distribute data to agents",
        variant: "destructive",
      });
    } finally {
      setIsDistributing(false);
    }
  };

  const validateCandidateData = (candidate: CandidateData) => {
    const issues = [];
    if (!candidate.email && !candidate.phone) {
      issues.push('Missing contact information');
    }
    if (!candidate.name) {
      issues.push('Missing name');
    }
    if (candidate.email && !candidate.email.includes('@')) {
      issues.push('Invalid email format');
    }
    return issues;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-500';
      case 'email_sent': return 'bg-blue-500/10 text-blue-500';
      case 'voice_called': return 'bg-purple-500/10 text-purple-500';
      case 'whatsapp_sent': return 'bg-green-500/10 text-green-500';
      case 'completed': return 'bg-emerald-500/10 text-emerald-500';
      case 'failed': return 'bg-red-500/10 text-red-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Database className="w-6 h-6 text-primary" />
              Data Distribution Layer
            </h2>
            <p className="text-muted-foreground">
              Centralized candidate data management and agent distribution
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={loadCandidateData} variant="outline" disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Distribution Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Candidates</p>
                <p className="text-xl font-bold">{stats.totalCandidates}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Ready</p>
                <p className="text-xl font-bold">{stats.readyForDistribution}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
            <div className="flex items-center gap-3">
              <ArrowRight className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-xl font-bold">{stats.inProgress}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-xl font-bold">{stats.completed}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-xl font-bold">{stats.failed}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Distribution Progress */}
        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Distribution Progress</h3>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Overall Completion</span>
                <span>{Math.round((stats.completed / stats.totalCandidates) * 100) || 0}%</span>
              </div>
              <Progress value={(stats.completed / stats.totalCandidates) * 100 || 0} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Ready for Distribution</span>
                <span>{Math.round((stats.readyForDistribution / stats.totalCandidates) * 100) || 0}%</span>
              </div>
              <Progress value={(stats.readyForDistribution / stats.totalCandidates) * 100 || 0} className="h-2" />
            </div>
          </div>
        </Card>

        {/* Filters and Search */}
        <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search candidates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="email_sent">Email Sent</SelectItem>
                <SelectItem value="voice_called">Voice Called</SelectItem>
                <SelectItem value="whatsapp_sent">WhatsApp Sent</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={() => distributeToAgents(
                filteredCandidates.filter(c => c.status === 'pending').map(c => c.id),
                ['email', 'voice', 'whatsapp']
              )}
              disabled={isDistributing || filteredCandidates.filter(c => c.status === 'pending').length === 0}
              variant="hero"
            >
              {isDistributing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4 mr-2" />
              )}
              Distribute to Agents
            </Button>
          </div>
        </Card>

        {/* Candidate Data Table */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <div className="p-4 border-b border-border/50">
            <h3 className="text-lg font-semibold">Candidate Data ({filteredCandidates.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4">Name</th>
                  <th className="text-left p-4">Contact</th>
                  <th className="text-left p-4">Location</th>
                  <th className="text-left p-4">Course</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Distribution</th>
                  <th className="text-left p-4">Validation</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map((candidate) => {
                  const validationIssues = validateCandidateData(candidate);
                  return (
                    <tr key={candidate.id} className="border-t border-border/50 hover:bg-muted/20">
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{candidate.name}</p>
                          <p className="text-xs text-muted-foreground">ID: {candidate.id.slice(0, 8)}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          {candidate.email && (
                            <p className="text-sm flex items-center gap-1">
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                              {candidate.email}
                            </p>
                          )}
                          {candidate.phone && (
                            <p className="text-sm flex items-center gap-1">
                              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                              {candidate.phone}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm">{candidate.city || 'N/A'}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm">{candidate.course || 'N/A'}</p>
                      </td>
                      <td className="p-4">
                        <Badge className={getStatusColor(candidate.status)}>
                          {candidate.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1">
                          {candidate.email_sent && (
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="w-2 h-2 bg-blue-500 rounded-full" />
                              </TooltipTrigger>
                              <TooltipContent>Email sent</TooltipContent>
                            </Tooltip>
                          )}
                          {candidate.voice_called && (
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="w-2 h-2 bg-purple-500 rounded-full" />
                              </TooltipTrigger>
                              <TooltipContent>Voice called</TooltipContent>
                            </Tooltip>
                          )}
                          {candidate.whatsapp_sent && (
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="w-2 h-2 bg-green-500 rounded-full" />
                              </TooltipTrigger>
                              <TooltipContent>WhatsApp sent</TooltipContent>
                            </Tooltip>
                          )}
                          {candidate.response_received && (
                            <Tooltip>
                              <TooltipTrigger>
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                              </TooltipTrigger>
                              <TooltipContent>Response received</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {validationIssues.length > 0 ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertCircle className="w-4 h-4 text-red-500" />
                            </TooltipTrigger>
                            <TooltipContent>{validationIssues.join(', ')}</TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger>
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            </TooltipTrigger>
                            <TooltipContent>Valid data</TooltipContent>
                          </Tooltip>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredCandidates.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No candidates found matching your criteria
              </div>
            )}
          </div>
        </Card>
      </div>
    </TooltipProvider>
  );
};

export default DataDistributionLayer;