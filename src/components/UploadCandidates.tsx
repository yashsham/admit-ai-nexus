import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthProvider';

interface Candidate {
  name: string;
  phone: string;
  email?: string;
  city?: string;
  course?: string;
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
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  const parseFile = async (file: File) => {
    try {
      const text = await file.text();
      let parsedData: Candidate[] = [];

      if (file.name.endsWith('.csv')) {
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            const values = lines[i].split(',');
            const candidate: any = {};

            headers.forEach((header, index) => {
              const value = values[index]?.trim() || '';
              if (header.includes('name')) candidate.name = value;
              else if (header.includes('phone') || header.includes('mobile')) candidate.phone = value;
              else if (header.includes('email')) candidate.email = value;
              else if (header.includes('city') || header.includes('location')) candidate.city = value;
              else if (header.includes('course') || header.includes('program')) candidate.course = value;
            });

            if (candidate.name && candidate.phone) {
              parsedData.push(candidate);
            }
          }
        }
      } else if (file.name.endsWith('.json')) {
        const jsonData = JSON.parse(text);
        if (Array.isArray(jsonData)) {
          parsedData = jsonData.filter(item => item.name && item.phone);
        }
      }

      setCandidates(parsedData);
      setPreview(true);

      toast({
        title: "File parsed successfully",
        description: `Found ${parsedData.length} valid candidates`,
      });
    } catch (error) {
      console.error('Error parsing file:', error);
      toast({
        title: "Error parsing file",
        description: "Please check your file format and try again",
        variant: "destructive",
      });
    }
  };

  const uploadCandidates = async () => {
    if (!user || !campaignId || candidates.length === 0) return;

    setUploading(true);
    try {
      const candidateData = candidates.map(candidate => ({
        campaign_id: campaignId,
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
      await supabase
        .from('campaigns')
        .update({ candidates_count: candidates.length })
        .eq('id', campaignId);

      toast({
        title: "Candidates uploaded successfully",
        description: `${candidates.length} candidates added to your campaign`,
      });

      onUploadComplete?.(candidates);
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
                  <p className="text-xs text-muted-foreground">CSV or JSON files only</p>
                </div>
                <Input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept=".csv,.json"
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
              disabled={uploading || !campaignId}
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