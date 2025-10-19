import { Mail, MessageCircle, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

const Footer = () => {
  return (
    <footer className="bg-card/50 border-t border-border/50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-ai-gradient rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-ai-gradient bg-clip-text text-transparent">
                AdmitConnect AI
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              Revolutionizing college admissions through AI-powered automation and intelligent campaign management.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Quick Links</h3>
            <div className="flex flex-col space-y-2">
              <a href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                Home
              </a>
              <a href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                About
              </a>
              <a href="/our-services" className="text-muted-foreground hover:text-foreground transition-colors">
                Services
              </a>
            </div>
          </div>

          {/* Contact Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Get in Touch</h3>
            <div className="flex flex-col space-y-3">
              <a 
                href="mailto:admitconnectAI@gmail.com"
                className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors group"
              >
                <Mail className="w-5 h-5 group-hover:text-primary transition-colors" />
                <span className="text-sm">admitconnectAI@gmail.com</span>
              </a>
              <a
                href="https://wa.me/918439663198"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors group"
              >
                <MessageCircle className="w-5 h-5 group-hover:text-primary transition-colors" />
                <span className="text-sm">+91 8439663198</span>
              </a>
            </div>
            <div className="flex space-x-3 pt-2">
              <Button
                size="sm"
                variant="outline"
                asChild
                className="hover-lift"
              >
                <a href="mailto:admitconnectAI@gmail.com">
                  <Mail className="w-4 h-4 mr-2" />
                  Email Us
                </a>
              </Button>
              <Button
                size="sm"
                variant="hero"
                asChild
                className="hover-lift"
              >
                <a 
                  href="https://wa.me/918439663198" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-border/50 text-center">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} AdmitConnect AI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;