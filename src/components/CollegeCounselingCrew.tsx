import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, TrendingUp, Users, Sparkles, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthProvider';
import ReactMarkdown from 'react-markdown';

interface StudentProfile {
  gpa?: number;
  sat?: number;
  act?: number;
  extracurriculars?: string;
  interests?: string;
  targetMajor?: string;
  location?: string;
}

export const CollegeCounselingCrew = () => {
  const [activeTab, setActiveTab] = useState<'counseling' | 'operations'>('counseling');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [profile, setProfile] = useState<StudentProfile>({
    gpa: undefined,
    sat: undefined,
    act: undefined,
    extracurriculars: '',
    interests: '',
    targetMajor: '',
    location: '',
  });
  const { toast } = useToast();
  const { user } = useAuth();

  const runCounselingCrew = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to use the counseling crew",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const processedProfile = {
        ...profile,
        extracurriculars: profile.extracurriculars?.split(',').map(e => e.trim()) || [],
        interests: profile.interests?.split(',').map(i => i.trim()) || [],
      };

      const { data, error } = await supabase.functions.invoke('college-counseling-crew', {
        body: {
          crewType: 'counseling',
          profile: processedProfile,
        },
      });

      if (error) throw error;

      if (data.success) {
        setResult(data.output);
        toast({
          title: "Analysis Complete",
          description: "Your personalized college counseling report is ready",
        });
      } else {
        throw new Error(data.error || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error running counseling crew:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate counseling report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runOperationsCrew = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to use the operations crew",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('college-counseling-crew', {
        body: {
          crewType: 'operations',
          userId: user.id,
        },
      });

      if (error) throw error;

      if (data.success) {
        setResult(data.output);
        toast({
          title: "Analysis Complete",
          description: "Your campaign strategy report is ready",
        });
      } else {
        throw new Error(data.error || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error running operations crew:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate operations report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-ai-gradient rounded-lg flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl">Autonomous AI Counseling Crew</CardTitle>
            <CardDescription>
              Multi-agent system with RAG and real-time data integration
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="counseling" className="gap-2">
              <Users className="w-4 h-4" />
              Personalized Counseling
            </TabsTrigger>
            <TabsTrigger value="operations" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Campaign Operations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="counseling" className="space-y-6 mt-6">
            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="gpa">GPA</Label>
                  <Input
                    id="gpa"
                    type="number"
                    step="0.01"
                    min="0"
                    max="4"
                    placeholder="3.8"
                    value={profile.gpa || ''}
                    onChange={(e) => setProfile({ ...profile, gpa: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="sat">SAT Score</Label>
                  <Input
                    id="sat"
                    type="number"
                    placeholder="1450"
                    value={profile.sat || ''}
                    onChange={(e) => setProfile({ ...profile, sat: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="act">ACT Score</Label>
                  <Input
                    id="act"
                    type="number"
                    placeholder="32"
                    value={profile.act || ''}
                    onChange={(e) => setProfile({ ...profile, act: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="targetMajor">Target Major</Label>
                <Input
                  id="targetMajor"
                  placeholder="Computer Science"
                  value={profile.targetMajor}
                  onChange={(e) => setProfile({ ...profile, targetMajor: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="location">Preferred Location</Label>
                <Input
                  id="location"
                  placeholder="Northeast, California, etc."
                  value={profile.location}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="extracurriculars">Extracurriculars (comma-separated)</Label>
                <Textarea
                  id="extracurriculars"
                  placeholder="Debate Club Captain, Varsity Soccer, Student Council"
                  value={profile.extracurriculars}
                  onChange={(e) => setProfile({ ...profile, extracurriculars: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="interests">Interests (comma-separated)</Label>
                <Textarea
                  id="interests"
                  placeholder="Artificial Intelligence, Environmental Policy, Creative Writing"
                  value={profile.interests}
                  onChange={(e) => setProfile({ ...profile, interests: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <Sparkles className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">Agents Activated</p>
                <p className="text-xs text-muted-foreground">
                  College Profile Analyst → College Matchmaking Specialist
                </p>
              </div>
              <Badge variant="secondary">RAG Enabled</Badge>
            </div>

            <Button
              onClick={runCounselingCrew}
              disabled={loading || !profile.gpa}
              className="w-full"
              size="lg"
              variant="hero"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Agents Working...
                </>
              ) : (
                <>
                  <Brain className="w-5 h-5 mr-2" />
                  Generate Personalized Counseling Report
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="operations" className="space-y-6 mt-6">
            <div className="space-y-4">
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    Strategic Dashboard Analysis
                  </CardTitle>
                  <CardDescription>
                    Analyzes your campaign data for trends, patterns, and optimization opportunities
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    Campaign Strategy Design
                  </CardTitle>
                  <CardDescription>
                    Creates targeted multi-channel campaign strategies based on data insights
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <Sparkles className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">Agents Activated</p>
                <p className="text-xs text-muted-foreground">
                  Strategic Dashboard Analyst → Campaign Operations Executive
                </p>
              </div>
              <Badge variant="secondary">Real-Time Data</Badge>
            </div>

            <Button
              onClick={runOperationsCrew}
              disabled={loading}
              className="w-full"
              size="lg"
              variant="hero"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Analyzing Data...
                </>
              ) : (
                <>
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Generate Campaign Strategy Report
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>

        {result && (
          <Card className="mt-6 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Crew Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] w-full rounded-md border p-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{result}</ReactMarkdown>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};
