import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Crown, Rocket, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PricingSectionProps {
  onContactClick: () => void;
  onScheduleClick: () => void;
}

const PricingSection = ({ onContactClick, onScheduleClick }: PricingSectionProps) => {
  const navigate = useNavigate();

  const plans = [
    {
      name: "Starter",
      price: "$29",
      period: "/month",
      description: "Perfect for small colleges and testing",
      icon: Star,
      features: [
        "500 voice calls/month",
        "1,000 WhatsApp messages",
        "Basic analytics dashboard",
        "Email support",
        "2 campaign templates",
        "CSV upload"
      ],
      buttonVariant: "outline" as const,
      popular: false
    },
    {
      name: "Professional",
      price: "$99",
      period: "/month",
      description: "For growing institutions",
      icon: Rocket,
      features: [
        "2,500 voice calls/month",
        "5,000 WhatsApp messages",
        "Advanced analytics & reports",
        "Priority support",
        "Unlimited campaign templates",
        "CSV & Excel upload",
        "Custom voice training",
        "A/B testing"
      ],
      buttonVariant: "hero" as const,
      popular: true
    },
    {
      name: "Enterprise",
      price: "$299",
      period: "/month",
      description: "For large institutions and universities",
      icon: Crown,
      features: [
        "10,000+ voice calls/month",
        "20,000+ WhatsApp messages",
        "Custom analytics dashboard",
        "24/7 phone support",
        "White-label solution",
        "API access",
        "Dedicated account manager",
        "Custom integrations",
        "Multi-language support"
      ],
      buttonVariant: "premium" as const,
      popular: false
    }
  ];

  return (
    <div className="py-20 bg-background" id="pricing">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Choose Your Perfect Plan
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Scale your admission automation with transparent pricing that grows with your institution
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            return (
              <Card
                key={index}
                className={`relative p-8 bg-card/50 backdrop-blur-sm border-border/50 hover-lift ${plan.popular ? 'popular-glow glow-border' : ''
                  }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-ai-gradient text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Plan Header */}
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-ai-gradient rounded-lg flex items-center justify-center mx-auto">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-card-foreground">{plan.name}</h3>
                    <p className="text-muted-foreground">{plan.description}</p>
                  </div>

                  {/* Pricing */}
                  <div className="text-center">
                    <div className="flex items-baseline justify-center">
                      <span className="text-5xl font-bold bg-ai-gradient bg-clip-text text-transparent logo-colorful">
                        {plan.price}
                      </span>
                      <span className="text-muted-foreground ml-1">{plan.period}</span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center space-x-3">
                        <Check className="w-5 h-5 text-primary flex-shrink-0" />
                        <span className="text-card-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <Button
                    variant={plan.buttonVariant}
                    size="lg"
                    onClick={() => window.open('https://rzp.io/rzp/DOVfKeU', '_blank')}
                    className="w-full hover-lift"
                  >
                    Get Started with {plan.name}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Enterprise CTA */}
        <div className="text-center mt-16 p-8 bg-card/30 rounded-2xl border border-border/50">
          <h3 className="text-2xl font-bold text-foreground mb-4">
            Need a Custom Solution?
          </h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            For enterprises with specific requirements, we offer custom solutions with dedicated support,
            advanced integrations, and tailored features.
          </p>
          <Button variant="outline" size="lg" onClick={onContactClick} className="hover-lift">
            Contact Sales Team
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PricingSection;