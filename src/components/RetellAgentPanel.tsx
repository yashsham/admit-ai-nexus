import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Phone, FileText, Bot, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface RetellAgentPanelProps {
  agentId?: string;
}

const RetellAgentPanel: React.FC<RetellAgentPanelProps> = ({ 
  agentId = "agent_0b0a29061f41517a382a32035e" 
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [context, setContext] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [documentContent, setDocumentContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCalling, setIsCalling] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setIsProcessing(true);

    try {
      // Convert file to base64 for processing
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        
        if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
          setDocumentContent(content);
        } else {
          // For other document types, we could integrate with document parsing
          // For now, just use filename and basic info
          setDocumentContent(`Document: ${file.name} (${file.type})`);
        }
        
        toast({
          title: "Document uploaded",
          description: `${file.name} has been processed for the call context.`,
        });
      };
      
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Upload failed",
        description: "Failed to process the uploaded document.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const initiateCall = async () => {
    if (!phoneNumber) {
      toast({
        title: "Phone number required",
        description: "Please enter a phone number to call.",
        variant: "destructive",
      });
      return;
    }

    setIsCalling(true);

    try {
      const { data, error } = await supabase.functions.invoke('retell-agent', {
        body: {
          phone_number: phoneNumber,
          agent_id: agentId,
          context: context,
          document_content: documentContent
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Call initiated",
          description: `Call to ${phoneNumber} has been started successfully.`,
        });
        
        // Reset form
        setPhoneNumber('');
        setContext('');
        setUploadedFile(null);
        setDocumentContent('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        throw new Error(data.error || 'Failed to initiate call');
      }
    } catch (error) {
      console.error('Error initiating call:', error);
      toast({
        title: "Call failed",
        description: error instanceof Error ? error.message : "Failed to initiate the call.",
        variant: "destructive",
      });
    } finally {
      setIsCalling(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Retell.ai Agent Panel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1234567890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="agent">Agent ID</Label>
              <Input
                id="agent"
                value={agentId}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">Call Context</Label>
            <Textarea
              id="context"
              placeholder="Enter context or talking points for the call..."
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="document">Upload Document (Optional)</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload Document
              </Button>
              {uploadedFile && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  {uploadedFile.name}
                </span>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              accept=".txt,.pdf,.doc,.docx"
              className="hidden"
            />
          </div>

          {documentContent && (
            <div className="p-3 bg-muted rounded-lg">
              <Label className="text-sm font-medium">Document Content Preview:</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {documentContent.substring(0, 200)}
                {documentContent.length > 200 && '...'}
              </p>
            </div>
          )}

          <Button 
            onClick={initiateCall}
            disabled={isCalling || !phoneNumber}
            className="w-full"
          >
            {isCalling ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Initiating Call...
              </>
            ) : (
              <>
                <Phone className="h-4 w-4 mr-2" />
                Initiate Call
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Analysis Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The Retell.ai agent integrates with your existing AI analysis system to:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
            <li>Analyze uploaded documents for call context</li>
            <li>Generate intelligent talking points</li>
            <li>Track call performance and outcomes</li>
            <li>Integrate with campaign analytics</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default RetellAgentPanel;