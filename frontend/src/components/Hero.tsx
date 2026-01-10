import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollReveal, FadeIn } from "@/components/ui/scroll-reveal";
import { RippleButton } from "@/components/ui/ripple-button";
import { Brain, Phone, MessageSquare, BarChart3, Shield, Zap, ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

interface HeroProps {
  onWatchDemoClick: () => void;
  onScheduleDemoClick: () => void;
}

const Hero = ({ onWatchDemoClick, onScheduleDemoClick }: HeroProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      // Direct to auth for sign up
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

          <FadeIn delay={300}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <RippleButton
                variant="hero"
                size="lg"
                onClick={handleGetStarted}
                className="px-8 py-4 text-lg hover-lift animate-bounce-in"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </RippleButton>
              <RippleButton
                variant="outline"
                size="lg"
                onClick={onWatchDemoClick}
                className="px-8 py-4 text-lg hover-lift"
                rippleColor="rgba(59, 130, 246, 0.5)"
              >
                Watch Demo
              </RippleButton>
            </div>
          </FadeIn>

          {/* Stats */}
          <ScrollReveal direction="up" delay={500}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-16 pt-16 border-t border-border/50">
              <FadeIn delay={100}>
                <div className="text-center hover:scale-105 transition-transform duration-300">
                  <div className="text-3xl sm:text-4xl font-bold bg-ai-gradient bg-clip-text text-transparent logo-colorful animate-text-focus">
                    10,000+
                  </div>
                  <p className="text-muted-foreground mt-2">Students Contacted Daily</p>
                </div>
              </FadeIn>
              <FadeIn delay={200}>
                <div className="text-center hover:scale-105 transition-transform duration-300">
                  <div className="text-3xl sm:text-4xl font-bold bg-ai-gradient bg-clip-text text-transparent logo-colorful animate-text-focus">
                    300%
                  </div>
                  <p className="text-muted-foreground mt-2">Increase in Enrollment</p>
                </div>
              </FadeIn>
              <FadeIn delay={300}>
                <div className="text-center hover:scale-105 transition-transform duration-300">
                  <div className="text-3xl sm:text-4xl font-bold bg-ai-gradient bg-clip-text text-transparent logo-colorful animate-text-focus">
                    90%
                  </div>
                  <p className="text-muted-foreground mt-2">Reduction in Manual Work</p>
                </div>
              </FadeIn>
            </div>
          </ScrollReveal>
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
                <ScrollReveal
                  key={index}
                  direction="up"
                  delay={index * 100}
                  className="group h-full"
                >
                  <Card className="relative p-6 bg-card/50 backdrop-blur-sm border-border/50 hover-lift glow-border shine-effect h-full flex flex-col overflow-hidden transition-all duration-500 before:absolute before:inset-0 before:bg-ai-gradient-glow before:opacity-0 before:transition-opacity before:duration-500 hover:before:opacity-100 hover:shadow-glow">
                    <div className="space-y-4 flex-1 flex flex-col relative z-10">
                      <div className="relative w-14 h-14 bg-ai-gradient-shine rounded-xl flex items-center justify-center group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 shadow-glow">
                        <div className="absolute inset-0 bg-ai-gradient-shine rounded-xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"></div>
                        <Icon className="w-7 h-7 text-white relative z-10 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all duration-500" />
                      </div>
                      <h3 className="text-xl font-semibold text-card-foreground group-hover:text-primary-glow transition-colors duration-300 group-hover:drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]">{feature.title}</h3>
                      <p className="text-muted-foreground flex-1 group-hover:text-foreground/90 transition-colors duration-300">{feature.description}</p>
                    </div>
                  </Card>
                </ScrollReveal>
              );
            })}
          </div>

          <FadeIn delay={400}>
            <div className="text-center mt-16">
              <RippleButton
                variant="hero"
                size="lg"
                onClick={onScheduleDemoClick}
                className="hover-lift pulse"
              >
                Schedule Demo
                <ArrowRight className="w-5 h-5 ml-2" />
              </RippleButton>
            </div>
          </FadeIn>
        </div>
      </div>


    </div>
  );
};

export default Hero;