import { useEffect, useRef, useState } from 'react';

interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  triggerOnce?: boolean;
  skip?: boolean;
}

export const useIntersectionObserver = (
  options: UseIntersectionObserverOptions = {}
) => {
  const {
    root = null,
    rootMargin = '0px',
    threshold = 0,
    triggerOnce = false,
    skip = false,
  } = options;

  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const targetRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (skip || !targetRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isElementIntersecting = entry.isIntersecting;
        setIsIntersecting(isElementIntersecting);

        if (isElementIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }

        if (triggerOnce && isElementIntersecting) {
          observer.unobserve(entry.target);
        }
      },
      {
        root,
        rootMargin,
        threshold,
      }
    );

    observer.observe(targetRef.current);

    return () => observer.disconnect();
  }, [root, rootMargin, threshold, triggerOnce, skip, hasIntersected]);

  return {
    ref: targetRef,
    isIntersecting,
    hasIntersected,
  };
};

// Hook for lazy loading images
export const useLazyImage = (src: string, placeholder?: string) => {
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  
  const { ref, isIntersecting } = useIntersectionObserver({
    triggerOnce: true,
    threshold: 0.1,
  });

  useEffect(() => {
    if (isIntersecting && src) {
      const img = new Image();
      
      img.onload = () => {
        setImageSrc(src);
        setIsLoaded(true);
      };
      
      img.onerror = () => {
        setIsError(true);
      };
      
      img.src = src;
    }
  }, [isIntersecting, src]);

  return {
    ref,
    src: imageSrc,
    isLoaded,
    isError,
    isIntersecting,
  };
};

// Hook for viewport-based animations
export const useViewportAnimation = (
  threshold = 0.1,
  triggerOnce = true
) => {
  const { ref, isIntersecting, hasIntersected } = useIntersectionObserver({
    threshold,
    triggerOnce,
  });

  const shouldAnimate = triggerOnce ? hasIntersected : isIntersecting;

  return {
    ref,
    isVisible: isIntersecting,
    hasBeenVisible: hasIntersected,
    shouldAnimate,
  };
};

// Hook for infinite scrolling
export const useInfiniteScroll = (
  callback: () => void,
  options: { rootMargin?: string; threshold?: number } = {}
) => {
  const { rootMargin = '100px', threshold = 0 } = options;
  
  const { ref, isIntersecting } = useIntersectionObserver({
    rootMargin,
    threshold,
  });

  useEffect(() => {
    if (isIntersecting) {
      callback();
    }
  }, [isIntersecting, callback]);

  return ref;
};

// Hook for tracking element visibility analytics
export const useVisibilityTracking = (
  elementName: string,
  onVisible?: () => void,
  options: { threshold?: number; minVisibleTime?: number } = {}
) => {
  const { threshold = 0.5, minVisibleTime = 1000 } = options;
  const [visibilityDuration, setVisibilityDuration] = useState(0);
  const visibilityStartTime = useRef<number | null>(null);
  const hasTracked = useRef(false);

  const { ref, isIntersecting } = useIntersectionObserver({
    threshold,
  });

  useEffect(() => {
    if (isIntersecting && !visibilityStartTime.current) {
      visibilityStartTime.current = Date.now();
    } else if (!isIntersecting && visibilityStartTime.current) {
      const duration = Date.now() - visibilityStartTime.current;
      setVisibilityDuration(prev => prev + duration);
      
      if (duration >= minVisibleTime && !hasTracked.current) {
        hasTracked.current = true;
        onVisible?.();
        
        // Analytics tracking
        if (typeof window !== 'undefined' && 'gtag' in window) {
          (window as any).gtag('event', 'element_viewed', {
            element_name: elementName,
            visibility_duration: duration,
          });
        }
      }
      
      visibilityStartTime.current = null;
    }
  }, [isIntersecting, elementName, onVisible, minVisibleTime]);

  return {
    ref,
    isVisible: isIntersecting,
    visibilityDuration,
    hasBeenTracked: hasTracked.current,
  };
};