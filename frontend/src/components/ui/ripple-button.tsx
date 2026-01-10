import * as React from "react";
import { Button, type ButtonProps } from "./button";
import { cn } from "@/lib/utils";

export interface RippleButtonProps extends ButtonProps {
  rippleColor?: string;
}

export const RippleButton = React.forwardRef<HTMLButtonElement, RippleButtonProps>(
  ({ className, children, rippleColor = "rgba(255, 255, 255, 0.6)", onClick, ...props }, ref) => {
    const [ripples, setRipples] = React.useState<Array<{ id: number; x: number; y: number }>>([]);

    const addRipple = (event: React.MouseEvent<HTMLButtonElement>) => {
      const button = event.currentTarget;
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = event.clientX - rect.left - size / 2;
      const y = event.clientY - rect.top - size / 2;
      const newRipple = {
        id: Date.now(),
        x,
        y,
      };

      setRipples((prev) => [...prev, newRipple]);

      // Remove ripple after animation
      setTimeout(() => {
        setRipples((prev) => prev.filter((ripple) => ripple.id !== newRipple.id));
      }, 600);
    };

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      addRipple(event);
      onClick?.(event);
    };

    return (
      <Button
        ref={ref}
        className={cn("relative overflow-hidden", className)}
        onClick={handleClick}
        {...props}
      >
        {children}
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="absolute rounded-full animate-ripple pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: "100px",
              height: "100px",
              backgroundColor: rippleColor,
              transform: "scale(0)",
              animation: "ripple 0.6s linear",
            }}
          />
        ))}
      </Button>
    );
  }
);

RippleButton.displayName = "RippleButton";