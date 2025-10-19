import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, Users, Zap, Target, Mail, MessageCircle } from "lucide-react";
import { ContactModal } from "@/components/ContactModal";
import { ScheduleDemoModal } from "@/components/ScheduleDemoModal";
import { BackToTop } from "@/components/BackToTop";

const About = () => {
  const [showContact, setShowContact] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  const scrollToFeatures = () => {
    window.location.href = '/#features';
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar 
        onContactClick={() => setShowContact(true)}
        onScheduleClick={() => setShowSchedule(true)}
      />

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold">
            <span className="bg-ai-gradient bg-clip-text text-transparent">
              About AdmitConnect AI
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Revolutionizing college admissions through AI-powered automation,
            personalized outreach, and intelligent campaign management.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
            <p className="text-lg text-muted-foreground mb-6">
              We empower educational institutions to connect with prospective students
              through intelligent automation, personalized messaging, and data-driven insights.
            </p>
            <p className="text-lg text-muted-foreground">
              Our platform combines cutting-edge AI technology with proven
              admission strategies to help colleges and universities scale their
              outreach efforts while maintaining a personal touch.
            </p>
          </div>
          <div className="space-y-6">
            <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
              <Target className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Targeted Outreach</h3>
              <p className="text-muted-foreground">
                Reach the right students with personalized messaging that resonates
                with their interests and goals.
              </p>
            </Card>
            <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
              <Zap className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Automated Efficiency</h3>
              <p className="text-muted-foreground">
                Save time and resources while increasing your reach with
                intelligent automation that works 24/7.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-ai-gradient-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Making an Impact</h2>
            <p className="text-xl text-muted-foreground">
              See how we're transforming college admissions nationwide
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold bg-ai-gradient bg-clip-text text-transparent mb-2">
                500+
              </div>
              <p className="text-muted-foreground">Colleges Served</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold bg-ai-gradient bg-clip-text text-transparent mb-2">
                2M+
              </div>
              <p className="text-muted-foreground">Students Reached</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold bg-ai-gradient bg-clip-text text-transparent mb-2">
                85%
              </div>
              <p className="text-muted-foreground">Response Rate</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold bg-ai-gradient bg-clip-text text-transparent mb-2">
                98%
              </div>
              <p className="text-muted-foreground">Client Satisfaction</p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Meet the AdmitConnect AI Team</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Our passionate team of AI experts, educators, and developers is dedicated to 
            revolutionizing the college admission process.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg"
              variant="hero"
              onClick={() => window.open('/our-services', '_blank')}
              className="text-lg px-8 py-3"
            >
              Learn More About Our Services
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => setShowContact(true)}
              className="text-lg px-8 py-3"
            >
              <Mail className="w-5 h-5 mr-2" />
              Contact Us
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="p-6 text-center bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-xl transition-all duration-300">
            <div className="w-20 h-20 bg-ai-gradient rounded-full mx-auto mb-4 flex items-center justify-center">
              <Users className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">AI & Technology</h3>
            <p className="text-muted-foreground">
              Cutting-edge AI researchers and engineers building the future
              of educational technology.
            </p>
          </Card>
          <Card className="p-6 text-center bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-xl transition-all duration-300">
            <div className="w-20 h-20 bg-ai-gradient rounded-full mx-auto mb-4 flex items-center justify-center">
              <Target className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Education Experts</h3>
            <p className="text-muted-foreground">
              Former admissions counselors and education professionals who
              understand the industry.
            </p>
          </Card>
          <Card className="p-6 text-center bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-xl transition-all duration-300">
            <div className="w-20 h-20 bg-ai-gradient rounded-full mx-auto mb-4 flex items-center justify-center">
              <Zap className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Customer Success</h3>
            <p className="text-muted-foreground">
              Dedicated support team ensuring every client achieves their
              enrollment goals.
            </p>
          </Card>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Get in Touch</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Ready to transform your admissions process? Let's discuss how
            AdmitConnect AI can help your institution thrive.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="hero"
              size="lg"
              onClick={() => setShowSchedule(true)}
              className="hover-lift"
            >
              <Calendar className="w-5 h-5 mr-2" />
              Schedule Demo
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowContact(true)}
              className="hover-lift"
            >
              <Mail className="w-5 h-5 mr-2" />
              Contact Sales
            </Button>
          </div>
          
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            <a 
              href="mailto:admitconnectAI@gmail.com"
              className="flex flex-col items-center p-6 bg-card rounded-lg border border-border/50 hover:border-primary/50 transition-all hover:shadow-lg group"
            >
              <Mail className="w-12 h-12 text-primary mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold mb-2">Email</h3>
              <p className="text-muted-foreground text-sm text-center break-all">admitconnectAI@gmail.com</p>
            </a>
            <a 
              href="https://wa.me/918439663198"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center p-6 bg-card rounded-lg border border-border/50 hover:border-primary/50 transition-all hover:shadow-lg group"
            >
              <MessageCircle className="w-12 h-12 text-primary mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold mb-2">WhatsApp</h3>
              <p className="text-muted-foreground text-sm">+91 8439663198</p>
            </a>
          </div>
        </div>
      </section>

      <ContactModal 
        open={showContact} 
        onOpenChange={setShowContact} 
      />
      <ScheduleDemoModal 
        open={showSchedule} 
        onOpenChange={setShowSchedule} 
      />
      <Footer />
      <BackToTop />
    </div>
  );
};

export default About;