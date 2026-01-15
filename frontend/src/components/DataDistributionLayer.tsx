import { useState, useEffect } from "react"; // 1
import { Card } from "@/components/ui/card"; // 2
import { Button } from "@/components/ui/button"; // 3
import { Badge } from "@/components/ui/badge"; // 4
import { Progress } from "@/components/ui/progress"; // 5
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // 6
import { // 7
  Database, // 8
  Users, // 9
  FileText, // 10
  CheckCircle, // 11
  AlertCircle, // 12
  RefreshCw, // 13
  Download, // 14
  Upload, // 15
  Filter, // 16
  Search, // 17
  ArrowRight, // 18
  Activity, // 19
  ChevronLeft,
  ChevronRight
} from "lucide-react"; // 20
import { useToast } from "@/hooks/use-toast"; // 21
import { supabase } from "@/integrations/supabase/client"; // 22
import { Input } from "@/components/ui/input"; // 23
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // 24
import axios from "axios";

// 26
interface CandidateData { // 26
  id: string; // 27
  name: string; // 28
  email: string; // 29
  phone: string; // 30
  city: string; // 31
  course: string; // 32
  status: string; // 33
  campaign_id: string; // 34
  created_at: string; // 35
  updated_at: string; // 36
  email_sent?: boolean; // 37
  voice_called?: boolean; // 38
  whatsapp_sent?: boolean; // 39
  response_received?: boolean; // 40
} // 41
// 42
interface DistributionStats { // 43
  totalCandidates: number; // 44
  readyForDistribution: number; // 45
  inProgress: number; // 46
  completed: number; // 47
  failed: number; // 48
} // 49
// 50
const DataDistributionLayer = () => { // 51
  const { toast } = useToast(); // 52
  const [candidates, setCandidates] = useState<CandidateData[]>([]); // 53
  // Removed client-side filteredCandidates state
  const [stats, setStats] = useState<DistributionStats>({ // 55
    totalCandidates: 0, // 56
    readyForDistribution: 0, // 57
    inProgress: 0, // 58
    completed: 0, // 59
    failed: 0 // 60
  }); // 61
  const [loading, setLoading] = useState(false); // 62
  const [searchTerm, setSearchTerm] = useState(""); // 63
  const [statusFilter, setStatusFilter] = useState("all"); // 64
  const [isDistributing, setIsDistributing] = useState(false); // 65

  // Pagination State
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1); // Reset to page 1 on search change
      loadData();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter]);

  // Reload when page changes
  useEffect(() => {
    loadData();
  }, [page]);


  const loadData = async () => {
    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('token') || '';
      const headers = { Authorization: `Bearer ${token}` };

      // Parallel Fetch: Stats + List
      const [statsRes, listRes] = await Promise.all([
        axios.get(`${API_URL}/api/v1/candidates/distribution/stats`, { headers }),
        axios.get(`${API_URL}/api/v1/candidates/distribution/list`, {
          headers,
          params: {
            page: page,
            limit: 20,
            search: searchTerm || undefined,
            status: statusFilter === 'all' ? undefined : statusFilter
          }
        })
      ]);

      setStats(statsRes.data);
      setCandidates(listRes.data.data);
      setHasMore(listRes.data.hasMore);

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load candidate data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const distributeToAgents = async (candidateIds: string[], channels: string[]) => { // 139
    setIsDistributing(true); // 140
    try { // 141
      const results = []; // 142

      for (const channel of channels) { // 144
        let endpoint = ''; // 145
        switch (channel) { // 146
          case 'email': // 147
            endpoint = 'email-agent'; // 148
            break; // 149
          case 'voice': // 150
            endpoint = 'voice-agent'; // 151
            break; // 152
          case 'whatsapp': // 153
            endpoint = 'whatsapp-agent'; // 154
            break; // 155
          default: // 156
            continue; // 157
        } // 158
        // 159
        const { data, error } = await supabase.functions.invoke(endpoint, { // 160
          body: { // 161
            candidateIds, // 162
            distributedBy: 'data-distribution-layer' // 163
          } // 164
        }); // 165
        // 166
        if (error) throw error; // 167
        results.push({ channel, success: true, data }); // 168
      } // 169
      // 170
      toast({ // 171
        title: "Distribution Complete", // 172
        description: `Successfully distributed data to ${channels.length} channels`, // 173
      }); // 174
      // 175
      loadData(); // 176
    } catch (error) { // 177
      console.error('Error distributing data:', error); // 178
      toast({ // 179
        title: "Distribution Failed", // 180
        description: "Failed to distribute data to agents", // 181
        variant: "destructive", // 182
      }); // 183
    } finally { // 184
      setIsDistributing(false); // 185
    } // 186
  }; // 187
  // 188
  const validateCandidateData = (candidate: CandidateData) => { // 189
    const issues = []; // 190
    if (!candidate.email && !candidate.phone) { // 191
      issues.push('Missing contact information'); // 192
    } // 193
    if (!candidate.name) { // 194
      issues.push('Missing name'); // 195
    } // 196
    if (candidate.email && !candidate.email.includes('@')) { // 197
      issues.push('Invalid email format'); // 198
    } // 199
    return issues; // 200
  }; // 201
  // 202
  const getStatusColor = (status: string) => { // 203
    switch (status) { // 204
      case 'pending': return 'bg-yellow-500/10 text-yellow-500'; // 205
      case 'email_sent': return 'bg-blue-500/10 text-blue-500'; // 206
      case 'voice_called': return 'bg-purple-500/10 text-purple-500'; // 207
      case 'whatsapp_sent': return 'bg-green-500/10 text-green-500'; // 208
      case 'completed': return 'bg-emerald-500/10 text-emerald-500'; // 209
      case 'failed': return 'bg-red-500/10 text-red-500'; // 210
      default: return 'bg-gray-500/10 text-gray-500'; // 211
    } // 212
  }; // 213
  // 214
  return ( // 215
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
            <Button onClick={loadData} variant="outline" disabled={loading}>
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
              <Progress value={(stats.completed / (stats.totalCandidates || 1)) * 100 || 0} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Ready for Distribution</span>
                <span>{Math.round((stats.readyForDistribution / stats.totalCandidates) * 100) || 0}%</span>
              </div>
              <Progress value={(stats.readyForDistribution / (stats.totalCandidates || 1)) * 100 || 0} className="h-2" />
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
                candidates.filter(c => c.status === 'pending').map(c => c.id), // Only distribute visible pending ones for now
                ['email', 'voice', 'whatsapp']
              )}
              disabled={isDistributing || candidates.filter(c => c.status === 'pending').length === 0}
              variant="hero"
            >
              {isDistributing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4 mr-2" />
              )}
              Distribute (Top 20)
            </Button>
          </div>
        </Card>

        {/* Candidate Data Table */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <div className="p-4 border-b border-border/50 flex justify-between items-center">
            <h3 className="text-lg font-semibold">Candidate Data</h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm">Page {page}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={!hasMore}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
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
                {candidates.map((candidate) => {
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
            {candidates.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No candidates found matching your criteria
              </div>
            )}
          </div>
        </Card>
      </div>
    </TooltipProvider>
  );
}; // 484

export default DataDistributionLayer; // 486