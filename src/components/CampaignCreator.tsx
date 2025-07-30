import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Phone, MessageSquare, Mail, Calendar, Users, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthProvider';

interface CampaignCreatorProps {
  onCampaignCreated?: () => void;
}

export const CampaignCreator = ({ onCampaignCreated }: CampaignCreatorProps) => {
  const [campaignData, setCampaignData] = useState({
    name: '',
    type: '',
    scheduledAt: '',
    templateWhatsapp: '',
    templateVoice: '',
  });
  const [generating, setGenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const campaignTypes = [
    { value: 'whatsapp', label: 'WhatsApp Only', icon: MessageSquare, color: 'bg-green-500' },
    { value: 'voice', label: 'Voice Only', icon: Phone, color: 'bg-blue-500' },
    { value: 'both', label: 'Voice + WhatsApp', icon: Users, color: 'bg-purple-500' },
    { value: 'email', label: 'Email Campaign', icon: Mail, color: 'bg-orange-500' },
  ];

  const handleInputChange = (field: string, value: string) => {
    setCampaignData(prev => ({ ...prev, [field]: value }));
  };

  const generateScript = async (type: 'whatsapp' | 'voice') => {
    setGenerating(true);
    try {
      const prompt = type === 'whatsapp'
        ? `Generate a professional WhatsApp message template for college admission outreach. The message should be personalized, engaging, and encourage prospective students to learn more about our programs. Include placeholders for student name and course. Keep it under 160 characters.`
        : `Generate a professional voice call script for college admission outreach. The script should be warm, engaging, and designed to encourage prospective students to learn more about our programs. Include placeholders for student name and course. Keep it conversational and under 100 words.`;

      // Simulate AI generation (replace with actual AI service)
      const templates = {
        whatsapp: `Hi {{name}}! 👋 We noticed your interest in {{course}} at our college. We'd love to share how our program can help you achieve your career goals. Reply "YES" for more info! 🎓`,
        voice: `Hello {{name}}, this is calling from the admissions office. We're excited about your interest in our {{course}} program. I'd love to tell you about our unique opportunities and answer any questions. Do you have a few minutes to chat?`
      };

      setTimeout(() => {
        handleInputChange(
          type === 'whatsapp' ? 'templateWhatsapp' : 'templateVoice',
          templates[type]
        );
        setGenerating(false);
        toast({
          title: "Script generated!",
          description: `${type === 'whatsapp' ? 'WhatsApp' : 'Voice'} template has been generated.`,
        });
      }, 2000);
    } catch (error) {
      console.error('Error generating script:', error);
      toast({
        title: "Generation failed",
        description: "Failed to generate script. Please try again.",
        variant: "destructive",
      });
      setGenerating(false);
    }
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

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .insert([
          {
            user_id: user.id,
            name: campaignData.name,
            type: campaignData.type,
            template_whatsapp: campaignData.templateWhatsapp || null,
            template_voice: campaignData.templateVoice || null,
            scheduled_at: campaignData.scheduledAt ? new Date(campaignData.scheduledAt).toISOString() : null,
            status: 'draft'
          }
        ])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Campaign created!",
        description: "Your campaign has been created successfully.",
      });

      // Reset form
      setCampaignData({
        name: '',
        type: '',
        scheduledAt: '',
        templateWhatsapp: '',
        templateVoice: '',
      });

      onCampaignCreated?.();
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: "Creation failed",
        description: "Failed to create campaign. Please try again.",
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
          <h3 className="text-lg font-semibold mb-2">Create New Campaign</h3>
          <p className="text-muted-foreground text-sm">
            Set up your admission outreach campaign with AI-powered messaging
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
            />
          </div>

          <div>
            <Label htmlFor="campaign-type">Campaign Type</Label>
            <Select value={campaignData.type} onValueChange={(value) => handleInputChange('type', value)}>
              <SelectTrigger>
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
            <Label htmlFor="scheduled-at">Schedule For (Optional)</Label>
            <Input
              id="scheduled-at"
              type="datetime-local"
              value={campaignData.scheduledAt}
              onChange={(e) => handleInputChange('scheduledAt', e.target.value)}
            />
          </div>
        </div>

        {selectedType && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <selectedType.icon className="w-3 h-3" />
                {selectedType.label}
              </Badge>
            </div>

            {(campaignData.type === 'whatsapp' || campaignData.type === 'both') && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="whatsapp-template">WhatsApp Template</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => generateScript('whatsapp')}
                    disabled={generating}
                  >
                    <Wand2 className="w-4 h-4 mr-1" />
                    {generating ? 'Generating...' : 'AI Generate'}
                  </Button>
                </div>
                <Textarea
                  id="whatsapp-template"
                  placeholder="Enter your WhatsApp message template..."
                  value={campaignData.templateWhatsapp}
                  onChange={(e) => handleInputChange('templateWhatsapp', e.target.value)}
                  rows={3}
                />
                <div className="text-xs text-muted-foreground mt-1">
                  Use {`{{name}}`} for student name, {`{{course}}`} for course name
                </div>
              </div>
            )}

            {(campaignData.type === 'voice' || campaignData.type === 'both') && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="voice-template">Voice Call Script</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => generateScript('voice')}
                    disabled={generating}
                  >
                    <Wand2 className="w-4 h-4 mr-1" />
                    {generating ? 'Generating...' : 'AI Generate'}
                  </Button>
                </div>
                <Textarea
                  id="voice-template"
                  placeholder="Enter your voice call script..."
                  value={campaignData.templateVoice}
                  onChange={(e) => handleInputChange('templateVoice', e.target.value)}
                  rows={4}
                />
                <div className="text-xs text-muted-foreground mt-1">
                  Use {`{{name}}`} for student name, {`{{course}}`} for course name
                </div>
              </div>
            )}
          </div>
        )}

        <Button
          onClick={createCampaign}
          disabled={creating || !campaignData.name || !campaignData.type}
          className="w-full"
          variant="hero"
        >
          {creating ? 'Creating...' : 'Create Campaign'}
        </Button>
      </div>
    </Card>
  );
};