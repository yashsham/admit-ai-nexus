import { useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import PricingSection from "@/components/PricingSection";
import { DemoModal } from "@/components/DemoModal";
import { ScheduleDemoModal } from "@/components/ScheduleDemoModal";
import { ContactModal } from "@/components/ContactModal";
import { BackToTop } from "@/components/BackToTop";
import { SEO, pageSEO } from "@/components/SEO";

const Index = () => {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <SEO {...pageSEO.home} />
      <Navbar
        onContactClick={() => setIsContactModalOpen(true)}
        onScheduleClick={() => setIsScheduleModalOpen(true)}
      />
      
      <Hero 
        onWatchDemoClick={() => setIsDemoModalOpen(true)}
        onScheduleDemoClick={() => setIsScheduleModalOpen(true)}
      />
      
      <PricingSection 
        onContactClick={() => setIsContactModalOpen(true)}
        onScheduleClick={() => setIsScheduleModalOpen(true)}
      />
      
      <DemoModal 
        open={isDemoModalOpen}
        onOpenChange={setIsDemoModalOpen}
      />
      
      <ScheduleDemoModal 
        open={isScheduleModalOpen}
        onOpenChange={setIsScheduleModalOpen}
      />
      
      <ContactModal 
        open={isContactModalOpen}
        onOpenChange={setIsContactModalOpen}
      />
      
      <BackToTop />
    </div>
  );
};

export default Index;
