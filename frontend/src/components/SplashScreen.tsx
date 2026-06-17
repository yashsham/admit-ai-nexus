import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300);
    }, 800);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-background via-primary/20 to-background transition-opacity duration-500",
        !isVisible && "opacity-0 pointer-events-none"
      )}
    >
      <div className="relative">
        {/* Animated rings */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute w-32 h-32 border-4 border-primary/30 rounded-full animate-[ping_2s_ease-in-out_infinite]" />
          <div className="absolute w-40 h-40 border-4 border-primary/20 rounded-full animate-[ping_2s_ease-in-out_0.5s_infinite]" />
          <div className="absolute w-48 h-48 border-4 border-primary/10 rounded-full animate-[ping_2s_ease-in-out_1s_infinite]" />
        </div>

        {/* Logo with scale animation */}
        <div className="relative z-10 animate-[scale-in_0.5s_ease-out]">
          <img
            src={`${import.meta.env.BASE_URL}app-logo.png`}
            alt="AdmitConnect AI"
            className="w-24 h-24 rounded-2xl shadow-2xl shadow-primary/50 animate-[float_3s_ease-in-out_infinite]"
          />
        </div>

        {/* Shimmer effect */}
        <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-[shimmer_2s_ease-in-out_infinite]" />
      </div>

      {/* App name with fade in */}
      <div className="absolute bottom-1/3 animate-[fade-in_1s_ease-out_0.5s_both]">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
          AdmitConnect AI
        </h1>
      </div>

      {/* Loading dots */}
      <div className="absolute bottom-1/4 flex gap-2 animate-[fade-in_1s_ease-out_1s_both]">
        <div className="w-2 h-2 rounded-full bg-primary animate-[bounce_1s_ease-in-out_infinite]" />
        <div className="w-2 h-2 rounded-full bg-primary animate-[bounce_1s_ease-in-out_0.2s_infinite]" />
        <div className="w-2 h-2 rounded-full bg-primary animate-[bounce_1s_ease-in-out_0.4s_infinite]" />
      </div>
    </div>
  );
};
