import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Play, ExternalLink, Star } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ScheduleDemoModal } from './ScheduleDemoModal';

interface DemoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DemoModal = ({ open, onOpenChange }: DemoModalProps) => {
  const [showScheduleDemo, setShowScheduleDemo] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(0);
  const navigate = useNavigate();

  const demoVideos = [
    {
      title: "Getting Started with AdmitConnect AI",
      description: "Learn how to set up your first campaign in under 5 minutes",
      thumbnail: "/admit-ai-nexus/placeholder.svg",
      duration: "4:32",
      url: "/admit-ai-nexus/videos/demo-campaign.mp4"
    },
    {
      title: "AI Voice Call Demo",
      description: "See our AI making real admission calls to prospective students",
      thumbnail: "/admit-ai-nexus/placeholder.svg",
      duration: "3:15",
      url: "/admit-ai-nexus/videos/demo-voice.mp4"
    },
    {
      title: "WhatsApp Automation Walkthrough",
      description: "Complete guide to WhatsApp campaign setup and management",
      thumbnail: "/admit-ai-nexus/placeholder.svg",
      duration: "6:45",
      url: "/admit-ai-nexus/videos/demo-whatsapp.mp4"
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Play className="w-5 h-5" />
            <span>Product Demos</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Featured Demo / Main Player */}
          <Card className="p-6 bg-ai-gradient-subtle border-primary/20 overflow-hidden">
            <div className="grid md:grid-cols-2 gap-6 items-center">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-primary">Now Playing</span>
                </div>
                <h3 className="text-2xl font-bold">{demoVideos[selectedVideo].title}</h3>
                <p className="text-muted-foreground">
                  {demoVideos[selectedVideo].description}
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="hero"
                    onClick={() => setShowScheduleDemo(true)}
                    className="hover-lift"
                  >
                    Schedule Live Demo
                  </Button>
                </div>
              </div>
              <div className="relative">
                <div className="aspect-video bg-black rounded-lg overflow-hidden border border-primary/20 flex items-center justify-center">
                  <video
                    key={demoVideos[selectedVideo].url}
                    controls
                    autoPlay
                    muted
                    className="w-full h-full object-contain"
                    poster={demoVideos[selectedVideo].thumbnail}
                  >
                    <source src={demoVideos[selectedVideo].url} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
            </div>
          </Card>

          {/* Video Selection Grid */}
          <div className="grid md:grid-cols-3 gap-4">
            {demoVideos.map((video, index) => (
              <Card
                key={index}
                className={cn(
                  "p-4 hover-lift cursor-pointer h-full flex flex-col transition-all duration-300",
                  selectedVideo === index ? "ring-2 ring-primary border-transparent bg-primary/5" : "hover:bg-accent"
                )}
                onClick={() => setSelectedVideo(index)}
              >
                <div className="space-y-3 flex flex-col h-full">
                  <div className="relative">
                    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                      {selectedVideo === index ? (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center z-10">
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center animate-pulse">
                            <Play className="w-4 h-4 text-white fill-current" />
                          </div>
                        </div>
                      ) : (
                        <Play className="w-8 h-8 text-primary" />
                      )}
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {video.duration}
                    </div>
                  </div>
                  <div className="space-y-1 flex-1">
                    <h4 className="font-semibold text-sm line-clamp-2">{video.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">{video.description}</p>
                  </div>
                  <Button
                    variant={selectedVideo === index ? "hero" : "outline"}
                    size="sm"
                    className="w-full"
                  >
                    {selectedVideo === index ? "Playing..." : "Watch Video"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Call to Action */}
          <div className="text-center p-6 bg-card/50 rounded-lg border border-border/50">
            <h3 className="text-lg font-semibold mb-2">Ready to Transform Your Admissions?</h3>
            <p className="text-muted-foreground mb-4">
              Start your free trial today and see the results within the first week.
            </p>
            <Button
              variant="hero"
              className="hover-lift"
              onClick={() => {
                onOpenChange(false);
                navigate('/auth');
              }}
            >
              Start Free Trial
            </Button>
          </div>
        </div>
      </DialogContent>


      <ScheduleDemoModal
        open={showScheduleDemo}
        onOpenChange={setShowScheduleDemo}
      />
    </Dialog>
  );
};