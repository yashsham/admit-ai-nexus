import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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

export const CampaignExecutor = ({ campaign, onExecutionComplete }: CampaignExecutorProps) => {
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [delayMinutes, setDelayMinutes] = useState(0);
  const [executing, setExecuting] = useState(false);
  const { toast } = useToast();

  const channels = [
    { id: 'email', label: 'Email', icon: Mail, color: 'text-blue-500' },
    { id: 'voice', label: 'Voice Call', icon: Phone, color: 'text-green-500' },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'text-emerald-500' }
  ];

  const handleChannelToggle = (channelId: string) => {
    setSelectedChannels(prev =>
      prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };

  const executeCampaign = async () => {
    if (selectedChannels.length === 0) {
      toast({
        title: "No Channels Selected",
        description: "Please select at least one communication channel",
        variant: "destructive"
      });
      return;
    }

    setExecuting(true);
    try {
      // Direct call to Python backend
      const { api } = await import('@/lib/api');
      await api.campaigns.execute(campaign.id);

      toast({
        title: "Campaign Started Successfully",
        description: `Executing across ${selectedChannels.length} channel(s) with ${delayMinutes}min delay`,
      });

      onExecutionComplete?.();
    } catch (error: any) {
      console.error('Campaign execution error:', error);

      toast({
        title: "Campaign Execution Failed",
        description: error.message || "Failed to start execution",
        variant: "destructive"
      });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Execute Campaign: {campaign.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Campaign Info */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{campaign.candidates_count} candidates</span>
            </div>
            <Badge variant="secondary">{campaign.status}</Badge>
          </div>
        </div>

        {/* Channel Selection */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Select Communication Channels</Label>
          <div className="grid grid-cols-1 gap-3">
            {channels.map((channel) => {
              const Icon = channel.icon;
              const isSelected = selectedChannels.includes(channel.id);

              return (
                <div
                  key={channel.id}
                  className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-all hover-lift ${isSelected ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  onClick={() => handleChannelToggle(channel.id)}
                >
                  <Checkbox
                    checked={isSelected}
                    onChange={() => handleChannelToggle(channel.id)}
                  />
                  <Icon className={`w-5 h-5 ${channel.color}`} />
                  <Label className="flex-1 cursor-pointer">{channel.label}</Label>
                </div>
              );
            })}
          </div>
        </div>

        {/* Delay Configuration */}
        <div className="space-y-2">
          <Label htmlFor="delay" className="text-base font-medium">
            Delay Between Channels (minutes)
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
            <span className="text-sm text-muted-foreground">minutes</span>
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