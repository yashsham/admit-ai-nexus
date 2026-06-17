import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Brain,
  MessageSquare,
  Phone,
  BarChart3,
  Users,
  Target,
  Clock,
  TrendingUp,
  Star,
  CheckCircle,
  ArrowRight,
  Zap,
  Shield,
  Globe
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { ContactModal } from "@/components/ContactModal";
import { ScheduleDemoModal } from "@/components/ScheduleDemoModal";

const OurServices = () => {
  const navigate = useNavigate();
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const services = [
    {
      icon: Brain,
      title: "AI-Driven Admission Counseling",
      description: "Intelligent guidance powered by advanced AI algorithms",
      features: [
        "Personalized course recommendations",
        "University matching based on profile",
        "Real-time admission probability analysis",
        "Document requirement tracking",
        "Application timeline management"
      ],
      color: "blue"
    },
    {
      icon: MessageSquare,
      title: "WhatsApp Automation",
      description: "Natural language communication at scale",
      features: [
        "24/7 automated responses",
        "Natural conversation flow",
        "Multi-language support",
        "Smart follow-up sequences",
        "Rich media sharing"
      ],
      color: "green"
    },
    {
      icon: Phone,
      title: "Voice Call Automation",
      description: "Intelligent voice interactions with prospective students",
      features: [
        "AI-powered voice calls",
        "Natural speech recognition",
        "Appointment scheduling",
        "Call quality analytics",
        "Integration with CRM systems"
      ],
      color: "purple"
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Comprehensive insights and performance tracking",
      features: [
        "Real-time engagement metrics",
        "Conversion rate tracking",
        "Student journey analytics",
        "ROI measurement",
        "Custom reporting"
      ],
      color: "orange"
    }
  ];

  const benefits = [
    {
      icon: Target,
      title: "Increased Conversion",
      description: "Up to 40% improvement in lead conversion rates"
    },
    {
      icon: Clock,
      title: "24/7 Availability",
      description: "Round-the-clock student support and engagement"
    },
    {
      icon: Users,
      title: "Scalable Operations",
      description: "Handle thousands of inquiries simultaneously"
    },
    {
      icon: Shield,
      title: "Data Security",
      description: "Enterprise-grade security and privacy protection"
    },
    {
      icon: Zap,
      title: "Quick Implementation",
      description: "Get started in under 48 hours"
    },
    {
      icon: Globe,
      title: "Global Reach",
      description: "Multi-language support for international students"
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      green: "bg-green-500/10 text-green-500 border-green-500/20",
      purple: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      orange: "bg-orange-500/10 text-orange-500 border-orange-500/20"
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar 
        onContactClick={() => setIsContactModalOpen(true)}
        onScheduleClick={() => setIsScheduleModalOpen(true)}
      />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <Badge variant="outline" className="mb-6 px-4 py-2">
            <Star className="w-4 h-4 mr-2" />
            Comprehensive AI Solutions
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-ai-gradient bg-clip-text text-transparent">
            Our Services
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Transform your admission process with our suite of AI-powered tools designed to 
            engage, convert, and retain prospective students at scale.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {services.map((service, index) => (
              <Card key={index} className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className={`w-16 h-16 rounded-xl ${getColorClasses(service.color)} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <service.icon className="w-8 h-8" />
                  </div>
                  <CardTitle className="text-2xl mb-2">{service.title}</CardTitle>
                  <CardDescription className="text-base">
                    {service.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {service.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Choose AdmitConnect AI?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience the benefits that leading educational institutions trust
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="text-center p-6 hover:shadow-lg transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground">{benefit.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Simple implementation process to get you started
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Integration", description: "Connect your existing systems" },
              { step: "02", title: "Configuration", description: "Customize AI responses and workflows" },
              { step: "03", title: "Training", description: "AI learns your institution's specifics" },
              { step: "04", title: "Launch", description: "Go live and start engaging students" }
            ].map((item, index) => (
              <div key={index} className="text-center relative">
                <div className="w-16 h-16 bg-ai-gradient rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
                {index < 3 && (
                  <ArrowRight className="hidden md:block absolute top-8 -right-4 w-6 h-6 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-ai-gradient-subtle">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Transform Your Admissions?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join hundreds of institutions already using AdmitConnect AI to boost their admission success
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              variant="hero"
              onClick={() => setIsScheduleModalOpen(true)}
              className="text-lg px-8 py-3"
            >
              Schedule Demo
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => setIsContactModalOpen(true)}
              className="text-lg px-8 py-3"
            >
              Contact Sales
            </Button>
          </div>
        </div>
      </section>

      <ContactModal 
        open={isContactModalOpen}
        onOpenChange={setIsContactModalOpen}
      />
      
      <ScheduleDemoModal 
        open={isScheduleModalOpen}
        onOpenChange={setIsScheduleModalOpen}
      />
    </div>
  );
};

export default OurServices;