import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Zap, Crown, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './AuthProvider';

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const PaymentModal = ({ open, onOpenChange }: PaymentModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();

  const handleRazorpayPayment = () => {
    if (typeof window.Razorpay === 'undefined') {
      // Load Razorpay script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => initializePayment();
      document.body.appendChild(script);
    } else {
      initializePayment();
    }
  };

  const initializePayment = () => {
    const options = {
      key: 'rzp_test_DEMO_KEY', // Demo key - replace with actual
      amount: 299900, // ₹2999 in paise
      currency: 'INR',
      name: 'AdmitConnect AI',
      description: 'Pro Plan Subscription',
      image: '/favicon.ico',
      prefill: {
        name: user?.user_metadata?.full_name || 'User',
        email: user?.email || '',
      },
      theme: {
        color: '#3B82F6'
      },
      handler: function (response: any) {
        // Payment successful
        toast({
          title: "Payment Successful!",
          description: "Welcome to AdmitConnect AI Pro! 🎉",
        });
        onOpenChange(false);

        // Here you would typically update the user's subscription in your database
        console.log('Payment ID:', response.razorpay_payment_id);
      },
      modal: {
        ondismiss: function () {
          toast({
            title: "Payment Cancelled",
            description: "You can upgrade anytime from your dashboard.",
          });
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const plans = [
    {
      name: "Starter",
      price: "₹999",
      originalPrice: "₹1,999",
      period: "/month",
      description: "Perfect for small colleges",
      icon: Sparkles,
      features: [
        "500 voice calls/month",
        "1,000 WhatsApp messages",
        "Basic analytics dashboard",
        "Email support",
        "2 campaign templates"
      ],
      popular: false,
      discount: "50% OFF"
    },
    {
      name: "Professional",
      price: "₹2,999",
      originalPrice: "₹5,999",
      period: "/month",
      description: "Most popular for growing institutions",
      icon: Zap,
      features: [
        "2,500 voice calls/month",
        "5,000 WhatsApp messages",
        "Advanced analytics & reports",
        "Priority support",
        "Unlimited campaign templates",
        "Custom voice training",
        "A/B testing"
      ],
      popular: true,
      discount: "50% OFF"
    },
    {
      name: "Enterprise",
      price: "₹9,999",
      originalPrice: "₹19,999",
      period: "/month",
      description: "For large universities",
      icon: Crown,
      features: [
        "10,000+ voice calls/month",
        "20,000+ WhatsApp messages",
        "Custom analytics dashboard",
        "24/7 phone support",
        "White-label solution",
        "API access",
        "Dedicated account manager",
        "Custom integrations"
      ],
      popular: false,
      discount: "50% OFF"
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            Upgrade to Pro - Limited Time Offer!
          </DialogTitle>
          <p className="text-center text-muted-foreground">
            Transform your admission process with AI-powered automation
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            return (
              <Card 
                key={index} 
                className={`relative p-6 ${
                  plan.popular ? 'ring-2 ring-primary border-primary' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <div className="text-center space-y-4">
                  {/* Plan Header */}
                  <div>
                    <div className="w-12 h-12 bg-ai-gradient rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>

                  {/* Pricing */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-3xl font-bold text-primary">{plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-sm line-through text-muted-foreground">
                        {plan.originalPrice}
                      </span>
                      <Badge variant="destructive" className="text-xs">
                        {plan.discount}
                      </Badge>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-2 text-left">
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center space-x-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <Button
                    variant={plan.popular ? "hero" : "outline"}
                    size="lg"
                    onClick={handleRazorpayPayment}
                    className="w-full mt-6"
                  >
                    {plan.popular ? "Choose Pro" : `Get ${plan.name}`}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 p-6 bg-ai-gradient-subtle rounded-lg">
          <div className="text-center space-y-4">
            <h3 className="text-xl font-bold">🎉 Special Launch Offer</h3>
            <p className="text-muted-foreground">
              Get 50% off for the first 3 months. No setup fees. Cancel anytime.
            </p>
            <div className="flex justify-center items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>30-day money-back guarantee</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>24/7 customer support</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-muted-foreground mt-4">
          <p>
            Payments are secured by Razorpay. Your card details are never stored on our servers.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};