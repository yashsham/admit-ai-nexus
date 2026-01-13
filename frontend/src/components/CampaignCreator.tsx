import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Phone, MessageSquare, Mail, Users, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './AuthProvider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CampaignCreatorProps {
  onCampaignCreated?: () => void;
}

export const CampaignCreator = ({ onCampaignCreated }: CampaignCreatorProps) => {
  const [campaignData, setCampaignData] = useState({
    name: '',
    type: '',

    scheduledAt: '',
    targetAudience: 'all',
  });
  const [aiInstructions, setAiInstructions] = useState('');
  const [promptOpen, setPromptOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const campaignTypes = [
    { value: 'email', label: 'Email Only', icon: Mail, color: 'bg-orange-500' },
    { value: 'whatsapp', label: 'WhatsApp Only', icon: MessageSquare, color: 'bg-green-500' },
    { value: 'voice', label: 'Voice Only', icon: Phone, color: 'bg-blue-500' },
    { value: 'email_whatsapp', label: 'Email + WhatsApp', icon: Users, color: 'bg-purple-500' },
    { value: 'voice_whatsapp', label: 'Voice + WhatsApp', icon: Users, color: 'bg-indigo-500' },
    { value: 'email_voice', label: 'Email + Voice', icon: Users, color: 'bg-pink-500' },
  ];

  const handleInputChange = (field: string, value: string) => {
    setCampaignData(prev => ({ ...prev, [field]: value }));
  };

  const createCampaign = async () => {
    if (!user || !campaignData.name || !campaignData.type) {
      toast({
        title: "Missing information",
        description: "Please fill in campaign name and type.",
        variant: "destructive",
      });
      return;
    }

    if (!aiInstructions.trim()) {
      toast({
        title: "Missing AI Instructions",
        description: "Please provide instructions for the AI content generator.",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      // Dynamic import to avoid circular dependencies
      const { api } = await import('@/lib/api');

      // Map selection to channels
      let channels: string[] = [];
      const t = campaignData.type;

      if (t === 'email') channels = ['email'];
      else if (t === 'whatsapp') channels = ['whatsapp'];
      else if (t === 'voice') channels = ['voice'];
      else if (t === 'email_whatsapp') channels = ['email', 'whatsapp'];
      else if (t === 'voice_whatsapp') channels = ['voice', 'whatsapp'];
      else if (t === 'email_voice') channels = ['email', 'voice'];

      const result = await api.campaigns.create(
        user.id,
        campaignData.name,
        aiInstructions,
        channels,
        campaignData.targetAudience
      );

      if (result.success) {
        toast({
          title: "Campaign Initiated!",
          description: "AI is ready to generate unique content for your candidates.",
        });

        // Reset form
        setCampaignData({
          name: '',
          type: '',

          scheduledAt: '',
          targetAudience: 'all',
        });
        setAiInstructions('');
        onCampaignCreated?.();
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: "Creation failed",
        description: "Failed to create campaign. Ensure backend is running.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const selectedType = campaignTypes.find(t => t.value === campaignData.type);

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Create Interactive Campaign</h3>
          <p className="text-muted-foreground text-sm">
            Configure AI to generate unique, personalized content for every candidate at runtime.
          </p>
        </div>

        <div className="grid gap-4">
          <div>
            <Label htmlFor="campaign-name">Campaign Name</Label>
            <Input
              id="campaign-name"
              placeholder="e.g., Engineering Fall 2024 Outreach"
              value={campaignData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="campaign-type">Campaign Type</Label>
            <Select value={campaignData.type} onValueChange={(value) => handleInputChange('type', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select campaign type" />
              </SelectTrigger>
              <SelectContent>
                {campaignTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${type.color}`} />
                        <Icon className="w-4 h-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="audience">Target Audience</Label>
            <Select
              value={campaignData.targetAudience}
              onValueChange={(value) => handleInputChange('targetAudience', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select audience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Candidates</SelectItem>
                <SelectItem value="tag:new">New Leads (Tagged 'new')</SelectItem>
                <SelectItem value="tag:interested">Interested (Tagged 'interested')</SelectItem>
                <SelectItem value="tag:waitlist">Waitlist (Tagged 'waitlist')</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedType && (
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <h4 className="font-medium">AI Personalization Engine</h4>
            </div>

            <p className="text-sm text-muted-foreground">
              Instead of a single template, provide instructions. The AI will generate a
              <strong> unique message for every candidate</strong> based on their city, course, and name.
            </p>

            <div className="pt-2">
              {aiInstructions ? (
                <div className="bg-muted p-3 rounded-md text-sm italic mb-2 relative group">
                  "{aiInstructions}"
                  <Button variant="ghost" size="sm" className="absolute top-1 right-1 h-6 text-xs opacity-0 group-hover:opacity-100" onClick={() => setPromptOpen(true)}>Edit</Button>
                </div>
              ) : (
                <div className="p-3 border border-dashed rounded-md text-sm text-center text-muted-foreground mb-2">
                  No instructions set.
                </div>
              )}

              <Dialog open={promptOpen} onOpenChange={setPromptOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    {aiInstructions ? 'Edit Instructions' : 'Set AI Instructions'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>AI Instructions</DialogTitle>
                    <DialogDescription>
                      Tell the AI how to behave. It will use this prompt to write unique messages for each candidate.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Label htmlFor="prompt" className="mb-2 block">Prompt</Label>
                    <Textarea
                      id="prompt"
                      placeholder="Example: Be friendly and professional. Ask them about their interest in [Course]. Mention something nice about [City]. Keep it under 150 characters."
                      className="min-h-[150px]"
                      value={aiInstructions}
                      onChange={(e) => setAiInstructions(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <Button onClick={() => setPromptOpen(false)}>Save Instructions</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}

        <Button
          onClick={createCampaign}
          disabled={creating || !campaignData.name || !campaignData.type || !aiInstructions}
          className="w-full"
          variant="hero"
        >
          {creating ? 'Initializing AI...' : 'Create Campaign'}
        </Button>
      </div>
    </Card>
  );
};