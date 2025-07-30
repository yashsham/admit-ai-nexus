import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Brain, Phone, MessageSquare, BarChart3, Shield, Zap, ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { DemoModal } from "./DemoModal";

const Hero = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showDemo, setShowDemo] = useState(false);

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  const features = [
    {
      icon: Phone,
      title: "AI Voice Calls",
      description: "Natural, human-like voice conversations with candidates"
    },
    {
      icon: MessageSquare,
      title: "WhatsApp Automation",
      description: "Personalized messages with delivery tracking"
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Real-time campaign performance and insights"
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-level security with IP monitoring"
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Process thousands of candidates in minutes"
    },
    {
      icon: Brain,
      title: "AI-Powered",
      description: "Advanced AI handles conversations automatically"
    }
  ];

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen pt-16 hero-black hero-rainbow-hover">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Sparkles className="w-4 h-4 mr-2 text-primary" />
              <span className="text-sm text-primary font-medium">AI-Powered Admission Automation</span>
            </div>
            
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold leading-tight">
              <span className="block text-foreground">Revolutionize</span>
              <span className="block bg-ai-gradient bg-clip-text text-transparent logo-colorful">
                College Admissions
              </span>
              <span className="block text-foreground">with AI</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Automate voice calls, WhatsApp messaging, and candidate outreach with our intelligent AI system. 
              Increase enrollment rates by 300% while reducing manual work by 90%.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              variant="hero"
              size="lg"
              onClick={handleGetStarted}
              className="px-8 py-4 text-lg hover-lift"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowDemo(true)}
              className="px-8 py-4 text-lg hover-lift"
            >
              Watch Demo
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-16 pt-16 border-t border-border/50">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold bg-ai-gradient bg-clip-text text-transparent logo-colorful">
                10,000+
              </div>
              <p className="text-muted-foreground mt-2">Students Contacted Daily</p>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold bg-ai-gradient bg-clip-text text-transparent logo-colorful">
                300%
              </div>
              <p className="text-muted-foreground mt-2">Increase in Enrollment</p>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold bg-ai-gradient bg-clip-text text-transparent logo-colorful">
                90%
              </div>
              <p className="text-muted-foreground mt-2">Reduction in Manual Work</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="py-20 bg-ai-gradient-subtle" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Powerful Features for Modern Admissions
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to transform your admission process and connect with students effectively
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="p-6 bg-card/50 backdrop-blur-sm border-border/50 hover-lift glow-border">
                  <div className="space-y-4">
                    <div className="w-12 h-12 bg-ai-gradient rounded-lg flex items-center justify-center">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-card-foreground">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="text-center mt-16">
            <Button
              variant="hero"
              size="lg"
              onClick={scrollToFeatures}
              className="hover-lift"
            >
              Explore All Features
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      <DemoModal open={showDemo} onOpenChange={setShowDemo} />
    </div>
  );
};

export default Hero;