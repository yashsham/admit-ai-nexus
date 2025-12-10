import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox"; // Can remove if unused, but safety
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/components/AuthProvider";
import {
  Play,
  Mail,
  Phone,
  MessageSquare,
  Clock,
  Users,
  Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface Campaign {
  id: string;
  name: string;
  candidates_count: number;
  status: string;
}

interface CampaignExecutorProps {
  campaign: Campaign;
  onExecutionComplete?: () => void;
}

export const CampaignExecutor = ({ campaign: initialCampaign, onExecutionComplete }: CampaignExecutorProps) => {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(initialCampaign?.id || "");
  const [executionType, setExecutionType] = useState<string>("");
  const [delayMinutes, setDelayMinutes] = useState(0);
  const [executing, setExecuting] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaign ? [initialCampaign] : []);
  const { toast } = useToast();
  const { user } = useAuth(); // Assume we have access to user context

  // Fetch campaigns if not provided or to populate selector
  const loadCampaigns = async () => {
    if (!user) return;
    const { data } = await supabase.from('campaigns').select('id, name, candidates_count, status').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setCampaigns(data);
  };

  // Load on mount
  useEffect(() => { loadCampaigns(); }, [user]);

  const executionStrategies = [
    { value: 'email', label: 'Email Only', icon: Mail, color: 'text-orange-500' },
    { value: 'whatsapp', label: 'WhatsApp Only', icon: MessageSquare, color: 'text-green-500' },
    { value: 'voice', label: 'Voice Only', icon: Phone, color: 'text-blue-500' },
    { value: 'email_whatsapp', label: 'Email + WhatsApp', icon: Users, color: 'text-purple-500' },
    { value: 'voice_whatsapp', label: 'Voice + WhatsApp', icon: Users, color: 'text-indigo-500' },
    { value: 'email_voice', label: 'Email + Voice', icon: Users, color: 'text-pink-500' },
  ];

  const executeCampaign = async () => {
    if (!selectedCampaignId) {
      toast({ title: "Select a Campaign", variant: "destructive" });
      return;
    }
    if (!executionType) {
      toast({ title: "Select Execution Strategy", variant: "destructive" });
      return;
    }

    setExecuting(true);
    try {
      // Map Strategy to Channels
      let channels: string[] = [];
      if (executionType === 'email') channels = ['email'];
      else if (executionType === 'whatsapp') channels = ['whatsapp'];
      else if (executionType === 'voice') channels = ['voice'];
      else if (executionType === 'email_whatsapp') channels = ['email', 'whatsapp'];
      else if (executionType === 'voice_whatsapp') channels = ['voice', 'whatsapp'];
      else if (executionType === 'email_voice') channels = ['email', 'voice'];

      const { api } = await import('@/lib/api');
      // Update the campaign's channels first? Or pass channels to execute? 
      // api.execute currently takes only ID. It uses the campaign's EXISTING channels.
      // We should probably update the campaign's channels OR add a 'override_channels' arg to execute.
      // For now, let's UPDATE the campaign channels before executing to ensure strict adherence.

      await supabase.from('campaigns').update({ channels: channels }).eq('id', selectedCampaignId);

      await api.campaigns.execute(selectedCampaignId);

      toast({
        title: "Campaign Started",
        description: `Executing ${executionType} strategy.`,
      });

      onExecutionComplete?.();
    } catch (error: any) {
      console.error('Campaign execution error:', error);
      toast({ title: "Execution Failed", description: error.message, variant: "destructive" });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Campaign Execution Center
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Campaign Selector */}
        <div className="space-y-2">
          <Label>Select Target Campaign</Label>
          <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
            <SelectTrigger><SelectValue placeholder="Choose a campaign..." /></SelectTrigger>
            <SelectContent>
              {campaigns.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name} ({c.candidates_count} candidates)</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Strategy Selection (6 Options) */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Select Execution Strategy</Label>
          <div className="grid grid-cols-2 gap-3">
            {executionStrategies.map((strategy) => {
              const Icon = strategy.icon;
              const isSelected = executionType === strategy.value;
              return (
                <div
                  key={strategy.value}
                  className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-all hover:bg-accent ${isSelected ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border'}`}
                  onClick={() => setExecutionType(strategy.value)}
                >
                  <Icon className={`w-4 h-4 ${strategy.color}`} />
                  <span className="text-sm font-medium">{strategy.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Delay Configuration */}
        <div className="space-y-2">
          <Label htmlFor="delay" className="text-base font-medium">
            Delay (minutes)
          </Label>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <Input
              id="delay"
              type="number"
              min="0"
              max="1440"
              value={delayMinutes}
              onChange={(e) => setDelayMinutes(parseInt(e.target.value) || 0)}
              className="w-24"
            />
          </div>
        </div>

        {/* Execute Button */}
        <Button
          onClick={executeCampaign}
          disabled={executing || selectedChannels.length === 0}
          className="w-full"
          variant="hero"
        >
          {executing ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Executing Campaign...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Execute Campaign
            </>
          )}
        </Button>

        {selectedChannels.length > 0 && (
          <div className="text-sm text-muted-foreground text-center">
            Will execute: {selectedChannels.join(' → ')}
            {delayMinutes > 0 && ` with ${delayMinutes}min delay between channels`}
          </div>
        )}
      </CardContent>
    </Card>
  );
};