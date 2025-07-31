import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Lazy load heavy components
export const LazyDashboard = lazy(() => import('@/pages/Dashboard'));
export const LazyOurServices = lazy(() => import('@/pages/OurServices'));
export const LazyCampaignAnalytics = lazy(() => 
  import('@/components/CampaignAnalytics').then(module => ({ default: module.CampaignAnalytics }))
);
export const LazyCampaignAutomation = lazy(() => 
  import('@/components/CampaignAutomation').then(module => ({ default: module.CampaignAutomation }))
);
export const LazyNotificationCenter = lazy(() => 
  import('@/components/NotificationCenter').then(module => ({ default: module.NotificationCenter }))
);

// Reusable loading wrapper
export const withLazyLoading = (Component: React.ComponentType) => {
  return (props: any) => (
    <Suspense 
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <Component {...props} />
    </Suspense>
  );
};

// Performance optimization utilities
export const preloadComponent = (componentImport: () => Promise<any>) => {
  // Preload component on hover or focus
  return () => {
    componentImport();
  };
};

// Image optimization component
export const OptimizedImage = ({ 
  src, 
  alt, 
  className,
  width,
  height,
  ...props 
}: React.ImgHTMLAttributes<HTMLImageElement>) => {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      {...props}
    />
  );
};

// Debounced search hook for performance
import { useState, useEffect, useCallback } from 'react';

export const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Virtualized list component for large datasets
export const VirtualizedList = ({ 
  items, 
  renderItem, 
  itemHeight = 60,
  containerHeight = 400 
}: {
  items: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  itemHeight?: number;
  containerHeight?: number;
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );

  const visibleItems = items.slice(startIndex, endIndex);

  return (
    <div
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${startIndex * itemHeight}px)`,
          }}
        >
          {visibleItems.map((item, index) =>
            renderItem(item, startIndex + index)
          )}
        </div>
      </div>
    </div>
  );
};