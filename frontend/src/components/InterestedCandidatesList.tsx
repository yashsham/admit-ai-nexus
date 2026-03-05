
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageSquare, Mail, Phone, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface Candidate {
    id: string;
    name: string;
    email: string;
    phone: string;
    status: string;
    notes: string;
    updated_at: string;
}

export const InterestedCandidatesList = () => {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [callingId, setCallingId] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchInterestedCandidates = async () => {
        try {
            const { data, error } = await supabase
                .from('candidates')
                .select('*')
                .contains('tags', ['interested']) // Use tags instead of missing status column
                .order('updated_at', { ascending: false });

            if (error) throw error;
            setCandidates((data as any[]) || []);
        } catch (error) {
            console.error('Error fetching interested candidates:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInterestedCandidates();

        // Realtime subscription
        // Listening to all updates since we can't easily filter by array containment in realtime syntax
        const channel = supabase
            .channel('interested-leads')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'candidates' },
                (payload) => {
                    // Optimally we should check if the new row has the tag, but refetching is safer
                    fetchInterestedCandidates();
                    // Only toast if it WASN'T interested before? Too complex for now.
                    // Just toast generic update or silence it to avoid spam.
                    // keeping it simple.
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleContact = (type: 'email' | 'whatsapp', contact: string) => {
        if (type === 'email') {
            window.open(`mailto:${contact}`);
        } else {
            window.open(`https://wa.me/${contact.replace(/\D/g, '')}`);
        }
    };

    const handleVoiceCall = async (candidate: Candidate) => {
        try {
            setCallingId(candidate.id);
            toast({
                title: "Initiating Voice Call",
                description: `Connecting AI Agent to ${candidate.name}...`,
            });

            const result = await api.voice.callCandidate(
                candidate.id,
                candidate.phone,
                candidate.name
            );

            if (result.success) {
                toast({
                    title: "Call Triggered",
                    description: `The AI agent is now calling ${candidate.name}.`,
                    className: "bg-green-50 border-green-200",
                });
                fetchInterestedCandidates(); // Refresh to show voice_called status if it updates quickly
            }
        } catch (error: any) {
            toast({
                title: "Call Failed",
                description: error.message || "Failed to trigger voice call. Please check your Retell configuration.",
                variant: "destructive",
            });
        } finally {
            setCallingId(null);
        }
    };

    if (loading) return <div className="text-center py-4 text-muted-foreground">Loading leads...</div>;

    return (
        <Card className="border-t-4 border-t-orange-500">
            <CardHeader>
                <CardTitle className="text-xl flex items-center justify-between">
                    <span>🔥 Interested Candidates</span>
                    <Badge variant="secondary" className="text-orange-600 bg-orange-100">
                        {candidates.length} Leads
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {candidates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No interested candidates identified yet.
                        <br />
                        <span className="text-xs opacity-70">
                            Try running a campaign and waiting for replies.
                        </span>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Candidate</TableHead>
                                <TableHead>Contact Info</TableHead>
                                <TableHead>Last Activity</TableHead>
                                <TableHead>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {candidates.map((candidate) => (
                                <TableRow key={candidate.id}>
                                    <TableCell className="font-medium">
                                        {candidate.name || 'Unknown'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs space-y-1">
                                            {candidate.email && (
                                                <div className="flex items-center gap-1">
                                                    <Mail className="w-3 h-3 text-muted-foreground" />
                                                    {candidate.email}
                                                </div>
                                            )}
                                            {candidate.phone && (
                                                <div className="flex items-center gap-1">
                                                    <Phone className="w-3 h-3 text-muted-foreground" />
                                                    {candidate.phone}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {candidate.updated_at ? format(new Date(candidate.updated_at), 'MMM d, h:mm a') : '-'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            {candidate.email && (
                                                <Button variant="ghost" size="sm" onClick={() => handleContact('email', candidate.email)}>
                                                    <Mail className="w-4 h-4 text-blue-500" />
                                                </Button>
                                            )}
                                            {candidate.phone && (
                                                <Button variant="ghost" size="sm" onClick={() => handleContact('whatsapp', candidate.phone)}>
                                                    <MessageSquare className="w-4 h-4 text-green-500" />
                                                </Button>
                                            )}
                                            {candidate.phone && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleVoiceCall(candidate)}
                                                    disabled={callingId === candidate.id}
                                                >
                                                    {callingId === candidate.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                                                    ) : (
                                                        <Phone className="w-4 h-4 text-orange-500" />
                                                    )}
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
};
