import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Play, ExternalLink, Star } from 'lucide-react';
import { useState } from 'react';
import { ScheduleDemoModal } from './ScheduleDemoModal';

interface DemoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DemoModal = ({ open, onOpenChange }: DemoModalProps) => {
  const [showScheduleDemo, setShowScheduleDemo] = useState(false);
  const demoVideos = [
    {
      title: "Getting Started with AdmitConnect AI",
      description: "Learn how to set up your first campaign in under 5 minutes",
      thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
      duration: "4:32",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    },
    {
      title: "AI Voice Call Demo",
      description: "See our AI making real admission calls to prospective students",
      thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
      duration: "3:15",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    },
    {
      title: "WhatsApp Automation Walkthrough",
      description: "Complete guide to WhatsApp campaign setup and management",
      thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
      duration: "6:45",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    }
  ];

  const openVideo = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Play className="w-5 h-5" />
            <span>Product Demos</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Featured Demo */}
          <Card className="p-6 bg-ai-gradient-subtle border-primary/20">
            <div className="grid md:grid-cols-2 gap-6 items-center">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-primary">Featured Demo</span>
                </div>
                <h3 className="text-2xl font-bold">Complete Platform Overview</h3>
                <p className="text-muted-foreground">
                  See how AdmitConnect AI transforms admission workflows with real-world examples and live demonstrations.
                </p>
                <Button
                  variant="hero"
                  onClick={() => setShowScheduleDemo(true)}
                  className="hover-lift"
                >
                  Schedule Live Demo
                </Button>
              </div>
              <div className="relative">
                <div className="aspect-video bg-card rounded-lg flex items-center justify-center border">
                  <Play className="w-16 h-16 text-primary" />
                </div>
              </div>
            </div>
          </Card>

          {/* Video Demos */}
          <div className="grid md:grid-cols-3 gap-4">
            {demoVideos.map((video, index) => (
              <Card key={index} className="p-4 hover-lift cursor-pointer h-full flex flex-col" onClick={() => openVideo(video.url)}>
                <div className="space-y-3 flex flex-col h-full">
                  <div className="relative">
                    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                      <Play className="w-8 h-8 text-primary" />
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {video.duration}
                    </div>
                  </div>
                  <div className="space-y-1 flex-1">
                    <h4 className="font-semibold text-sm line-clamp-2">{video.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">{video.description}</p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    <ExternalLink className="w-3 h-3 mr-2" />
                    Watch Video
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
            <Button variant="hero" className="hover-lift">
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