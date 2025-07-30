import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Brain, Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface NavbarProps {
  onContactClick: () => void;
  onScheduleClick: () => void;
}

const Navbar = ({ onContactClick, onScheduleClick }: NavbarProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo with Hover Animation */}
          <div className="flex items-center space-x-2 cursor-pointer logo-hover" onClick={() => navigate("/")}>
            <div className="w-10 h-10 bg-ai-gradient rounded-lg flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-ai-gradient bg-clip-text text-transparent logo-colorful">
              AdmitConnect AI
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => {
                if (window.location.pathname !== '/') {
                  navigate('/');
                  setTimeout(() => {
                    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                } else {
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => {
                if (window.location.pathname !== '/') {
                  navigate('/');
                  setTimeout(() => {
                    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                } else {
                  document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </button>
            <Button
              variant="outline"
              onClick={onContactClick}
              className="hover-lift"
            >
              Contact
            </Button>
            <Button
              variant="hero"
              onClick={onScheduleClick}
              className="hover-lift"
            >
              Schedule Demo
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden pb-4 border-t border-border/50 mt-2">
            <div className="flex flex-col space-y-3 pt-4">
              <button
                onClick={() => {
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                  setIsMenuOpen(false);
                }}
                className="text-muted-foreground hover:text-foreground transition-colors text-left"
              >
                Features
              </button>
              <button
                onClick={() => {
                  document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                  setIsMenuOpen(false);
                }}
                className="text-muted-foreground hover:text-foreground transition-colors text-left"
              >
                Pricing
              </button>
              <div className="flex flex-col space-y-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    onContactClick();
                    setIsMenuOpen(false);
                  }}
                  className="w-full justify-center"
                >
                  Contact
                </Button>
                <Button
                  variant="hero"
                  onClick={() => {
                    onScheduleClick();
                    setIsMenuOpen(false);
                  }}
                  className="w-full justify-center"
                >
                  Schedule Demo
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;