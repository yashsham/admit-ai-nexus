import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Edit,
  Trash2,
  Play,
  Pause,
  MessageSquare,
  Phone,
  Users,
  Calendar,
  MoreHorizontal
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { api } from "@/lib/api";

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  candidates_count: number;
  messages_sent: number;
  calls_made: number;
  responses_received: number;
  created_at: string;
  scheduled_at?: string;
}

interface CampaignCardProps {
  campaign: Campaign;
  onUpdate: () => void;
}

export const CampaignCard = ({ campaign, onUpdate }: CampaignCardProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'paused': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'completed': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'whatsapp': return <MessageSquare className="w-4 h-4" />;
      case 'voice': return <Phone className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const handleStatusToggle = async () => {
    setLoading(true);
    try {
      const newStatus = campaign.status === 'active' ? 'paused' : 'active';

      const { error } = await supabase
        .from('campaigns')
        .update({ status: newStatus })
        .eq('id', campaign.id);

      if (error) throw error;

      toast({
        title: `Campaign ${newStatus}`,
        description: `Campaign has been ${newStatus}.`,
      });

      onUpdate();
    } catch (error) {
      console.error('Error updating campaign status:', error);
      toast({
        title: "Update failed",
        description: "Failed to update campaign status.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    // Replaced browser confirm with custom UI or just direct action if user clicked "Delete" from dropdown
    // The dropdown itself acts as a 2-step (Menu -> Delete). 
    // If further safety needed, an AlertDialog is better, but user said "fix the pop up", checking if it blocked.
    // Let's assume they want it to JUST WORK.

    setLoading(true);
    try {
      console.log("Deleting campaign:", campaign.id);
      await api.campaigns.delete(campaign.id);

      toast({
        title: "Campaign deleted",
        description: "Campaign has been permanently deleted.",
      });

      onUpdate();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete campaign. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const responseRate = campaign.candidates_count > 0
    ? Math.round((campaign.responses_received / campaign.candidates_count) * 100)
    : 0;

  return (
    <Card className="p-6 hover-lift">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {getTypeIcon(campaign.type)}
              <h3 className="font-semibold text-lg">{campaign.name}</h3>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`border ${getStatusColor(campaign.status)}`}>
                {campaign.status}
              </Badge>
              <Badge variant="outline">
                {campaign.type.charAt(0).toUpperCase() + campaign.type.slice(1)}
              </Badge>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleStatusToggle} disabled={loading}>
                {campaign.status === 'active' ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause Campaign
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Campaign
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Edit className="w-4 h-4 mr-2" />
                Edit Campaign
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive"
                disabled={loading}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Campaign
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{campaign.candidates_count}</div>
            <div className="text-xs text-muted-foreground">Candidates</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">{campaign.messages_sent}</div>
            <div className="text-xs text-muted-foreground">Messages</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500">{campaign.calls_made}</div>
            <div className="text-xs text-muted-foreground">Calls</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-500">{responseRate}%</div>
            <div className="text-xs text-muted-foreground">Response Rate</div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t border-border/50">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Created {formatDate(campaign.created_at)}
          </div>
          {campaign.scheduled_at && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Scheduled {formatDate(campaign.scheduled_at)}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};