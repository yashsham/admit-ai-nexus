import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthProvider';
import Papa from 'papaparse';

interface Candidate {
  name: string;
  phone: string;
  email?: string;
  city?: string;
  course?: string;
  [key: string]: any;
}

interface UploadCandidatesProps {
  campaignId?: string;
  onUploadComplete?: (candidates: Candidate[]) => void;
}

export const UploadCandidates = ({ campaignId, onUploadComplete }: UploadCandidatesProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [preview, setPreview] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(campaignId || '');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!campaignId) {
      loadCampaigns();
    }
  }, [campaignId]);

  const loadCampaigns = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
      if (data && data.length > 0 && !selectedCampaignId) {
        setSelectedCampaignId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  const [processing, setProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  // Import helpers (you would add imports at top)
  // import { extractTextFromFile } from '@/lib/fileParser';
  // import { extractCandidatesFromText } from '@/lib/candidateExtractor';

  const parseFile = async (file: File) => {
    try {
      // 1. Handle regular CSV (fast path)
      if (file.name.endsWith('.csv')) {
        parseCSV(file);
        return;
      }

      // 2. Handle JSON (fast path)
      if (file.name.endsWith('.json')) {
        parseJSON(file);
        return;
      }

      // 3. Handle other formats with AI extraction
      setProcessing(true);
      setProcessingStatus('Extracting text from file...');

      // Dynamic import to avoid SSR issues if any
      const { extractTextFromFile } = await import('@/lib/fileParser');
      const { extractCandidatesFromText } = await import('@/lib/candidateExtractor');

      const text = await extractTextFromFile(file);

      if (!text || text.trim().length === 0) {
        throw new Error("Could not extract any text from the file.");
      }

      setProcessingStatus('AI analyzing candidate data...');
      const extractedCandidates = await extractCandidatesFromText(text);

      if (extractedCandidates.length === 0) {
        toast({
          title: "No candidates found",
          description: "AI could not identify any candidate information in this file.",
          variant: "destructive",
        });
        setProcessing(false);
        return;
      }

      setCandidates(extractedCandidates);
      setPreview(true);
      toast({
        title: "File analyzed successfully",
        description: `AI found ${extractedCandidates.length} potential candidates`,
      });

    } catch (error: any) {
      console.error('Error parsing file:', error);
      toast({
        title: "Error parsing file",
        description: error.message || "Failed to process file with AI.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      setProcessingStatus('');
    }
  };

  const parseCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.toLowerCase().trim(),
      complete: (results) => {
        const parsedData: Candidate[] = [];
        results.data.forEach((row: any) => {
          const candidate: Candidate = {
            name: row.name || row['full name'] || row['candidate name'] || '',
            phone: row.phone || row.mobile || row['phone number'] || row['mobile number'] || '',
            email: row.email || row['email address'] || undefined,
            city: row.city || row.location || row.address || undefined,
            course: row.course || row.program || row.interest || undefined
          };

          if (candidate.name && candidate.phone) {
            // Basic validation to ensure phone is somewhat valid (clean it)
            const cleanPhone = candidate.phone.replace(/[^0-9]/g, '');
            if (cleanPhone.length >= 10) {
              candidate.phone = cleanPhone; // Use cleaned phone
              parsedData.push(candidate);
            }
          }
        });

        if (parsedData.length === 0) {
          toast({ title: "No valid candidates found", description: "Check CSV headers (name, phone)", variant: "destructive" });
          return;
        }

        setCandidates(parsedData);
        setPreview(true);
        toast({ title: "CSV parsed successfully", description: `Found ${parsedData.length} valid candidates` });
      },
      error: (error) => {
        toast({ title: "Error parsing CSV", description: error.message, variant: "destructive" });
      }
    });
  };

  const parseJSON = async (file: File) => {
    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      if (Array.isArray(jsonData)) {
        const parsedData = jsonData
          .filter(item => item.name && item.phone)
          .map(item => ({
            name: item.name,
            phone: item.phone,
            email: item.email,
            city: item.city,
            course: item.course
          }));

        setCandidates(parsedData);
        setPreview(true);
        toast({ title: "JSON parsed successfully", description: `Found ${parsedData.length} valid candidates` });
      }
    } catch (e) {
      toast({ title: "invalid JSON", variant: "destructive" });
    }
  };

  const uploadCandidates = async () => {
    const activeCampaignId = campaignId || selectedCampaignId;
    if (!user || !activeCampaignId || candidates.length === 0) return;

    setUploading(true);
    try {
      // 1. Check for duplicates in the current batch (simple check)
      const uniqueCandidates = Array.from(new Map(candidates.map(item => [item.phone, item])).values());

      if (uniqueCandidates.length < candidates.length) {
        toast({
          title: "Duplicates removed",
          description: `Removed ${candidates.length - uniqueCandidates.length} duplicate phone numbers from the batch.`,
        });
      }

      // 2. Check for duplicates in database
      // Fetch existing phone numbers for this campaign
      const { data: existingCandidates, error: fetchError } = await supabase
        .from('candidates')
        .select('phone')
        .eq('campaign_id', activeCampaignId);

      if (fetchError) throw fetchError;

      const existingPhones = new Set(existingCandidates?.map(c => c.phone) || []);

      const newCandidates = uniqueCandidates.filter(c => !existingPhones.has(c.phone));

      if (newCandidates.length === 0) {
        toast({
          title: "All candidates already exist",
          description: "All candidates in this file are already in this campaign.",
          variant: "destructive",
        });
        setUploading(false);
        return;
      }

      if (newCandidates.length < uniqueCandidates.length) {
        toast({
          title: "Existing candidates skipped",
          description: `Skipped ${uniqueCandidates.length - newCandidates.length} candidates that are already in this campaign.`,
        });
      }

      const candidateData = newCandidates.map(candidate => ({
        campaign_id: activeCampaignId,
        name: candidate.name,
        phone: candidate.phone,
        email: candidate.email || null,
        city: candidate.city || null,
        course: candidate.course || null,
      }));

      const { error } = await supabase
        .from('candidates')
        .insert(candidateData);

      if (error) throw error;

      // Update campaign candidates count
      // We need to get the current count first or just recount
      const { count } = await supabase
        .from('candidates')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', activeCampaignId);

      await supabase
        .from('campaigns')
        .update({ candidates_count: count })
        .eq('id', activeCampaignId);

      toast({
        title: "Candidates uploaded successfully",
        description: `${newCandidates.length} new candidates added to your campaign`,
      });

      onUploadComplete?.(newCandidates);
      setCandidates([]);
      setFile(null);
      setPreview(false);
    } catch (error) {
      console.error('Error uploading candidates:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload candidates. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Upload Candidates</h3>
          <p className="text-muted-foreground text-sm">
            Upload a CSV or JSON file with candidate information. Required fields: name, phone
          </p>
        </div>

        {!campaignId && campaigns.length === 0 && (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              Please create a campaign first before uploading candidates.
            </p>
          </div>
        )}

        {!campaignId && campaigns.length > 0 && (
          <div>
            <Label htmlFor="campaign-select">Select Campaign</Label>
            <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
              <SelectTrigger id="campaign-select" className="mt-2">
                <SelectValue placeholder="Choose a campaign" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {!preview ? (
          <div>
            <Label htmlFor="file-upload">Choose File</Label>
            <div className="mt-2 flex items-center justify-center w-full">
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-border border-dashed rounded-lg cursor-pointer bg-card/50 hover:bg-card/80"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">CSV, JSON, PDF, DOCX, Images</p>
                  {processing && (
                    <div className="mt-4 flex flex-col items-center">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                      <p className="mt-2 text-xs text-primary font-medium animate-pulse">{processingStatus}</p>
                    </div>
                  )}
                </div>
                <Input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept=".csv,.json,.pdf,.docx,.png,.jpg,.jpeg,.webp,.txt"
                  disabled={processing}
                  onChange={handleFileChange}
                />
              </label>
            </div>
            {file && (
              <div className="mt-2 flex items-center text-sm text-muted-foreground">
                <FileText className="w-4 h-4 mr-2" />
                {file.name}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-green-600">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span className="font-medium">{candidates.length} candidates found</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPreview(false);
                  setFile(null);
                  setCandidates([]);
                }}
              >
                Choose Different File
              </Button>
            </div>

            <div className="max-h-40 overflow-y-auto border rounded-lg p-3">
              <div className="text-xs font-medium text-muted-foreground mb-2">Preview:</div>
              {candidates.slice(0, 5).map((candidate, index) => (
                <div key={index} className="text-sm py-1 border-b border-border/50 last:border-0">
                  <span className="font-medium">{candidate.name}</span> - {candidate.phone}
                  {candidate.email && <span className="text-muted-foreground"> • {candidate.email}</span>}
                </div>
              ))}
              {candidates.length > 5 && (
                <div className="text-xs text-muted-foreground mt-2">
                  And {candidates.length - 5} more...
                </div>
              )}
            </div>

            <Button
              onClick={uploadCandidates}
              disabled={uploading || (!campaignId && !selectedCampaignId) || campaigns.length === 0}
              className="w-full"
              variant="hero"
            >
              {uploading ? "Uploading..." : `Upload ${candidates.length} Candidates`}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};