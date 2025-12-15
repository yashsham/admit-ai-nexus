// Performance monitoring utilities

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializeObservers();
  }

  private initializeObservers() {
    if (typeof window === 'undefined') return;

    // Core Web Vitals observer
    if ('PerformanceObserver' in window) {
      try {
        const cwvObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric(entry.name, (entry as unknown as { value?: number }).value || entry.startTime);
          }
        });

        cwvObserver.observe({
          entryTypes: ['largest-contentful-paint', 'first-input', 'cumulative-layout-shift']
        });
        this.observers.push(cwvObserver);
      } catch (error) {
        console.warn('Failed to initialize Core Web Vitals observer:', error);
      }

      // Navigation timing observer
      try {
        const navObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordMetric('page-load-time', navEntry.loadEventEnd - navEntry.fetchStart);
            this.recordMetric('dom-content-loaded', navEntry.domContentLoadedEventEnd - navEntry.fetchStart);
            this.recordMetric('first-paint', navEntry.responseEnd - navEntry.requestStart);
          }
        });

        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navObserver);
      } catch (error) {
        console.warn('Failed to initialize navigation timing observer:', error);
      }
    }
  }

  recordMetric(name: string, value: number) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now()
    };

    this.metrics.push(metric);

    // In production, you might want to send this to an analytics service
    if (process.env.NODE_ENV === 'development') {
      console.log(`Performance metric: ${name} = ${value}`);
    }
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter(metric => metric.name === name);
  }

  getAverageMetric(name: string): number {
    const metrics = this.getMetricsByName(name);
    if (metrics.length === 0) return 0;

    const sum = metrics.reduce((acc, metric) => acc + metric.value, 0);
    return sum / metrics.length;
  }

  // Measure function execution time
  measureFunction<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const end = performance.now();

    this.recordMetric(`function-${name}`, end - start);
    return result;
  }

  // Measure async function execution time
  async measureAsyncFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();

    this.recordMetric(`async-function-${name}`, end - start);
    return result;
  }

  // Clean up observers
  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export const usePerformanceMonitoring = () => {
  const measureRender = (componentName: string, renderFn: () => void) => {
    return performanceMonitor.measureFunction(`render-${componentName}`, renderFn);
  };

  const measureAsyncOperation = async <T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> => {
    return performanceMonitor.measureAsyncFunction(operationName, operation);
  };

  return {
    measureRender,
    measureAsyncOperation,
    recordMetric: performanceMonitor.recordMetric.bind(performanceMonitor),
    getMetrics: performanceMonitor.getMetrics.bind(performanceMonitor),
  };
};

// Bundle size analyzer utility
export const analyzeBundleSize = async () => {
  if (process.env.NODE_ENV !== 'production') {
    try {
      const response = await fetch('/stats.json');
      const stats = await response.json();

      console.group('Bundle Analysis');
      console.log('Total bundle size:', formatBytes(stats.assets.reduce((acc: number, asset: any) => acc + asset.size, 0)));
      console.log('Largest assets:');

      stats.assets
        .sort((a: any, b: any) => b.size - a.size)
        .slice(0, 10)
        .forEach((asset: any) => {
          console.log(`  ${asset.name}: ${formatBytes(asset.size)}`);
        });

      console.groupEnd();
    } catch (error) {
      console.warn('Failed to analyze bundle size:', error);
    }
  }
};

// Utility functions
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Memory usage monitoring
export const getMemoryUsage = (): any => {
  if ('memory' in performance) {
    return {
      usedJSHeapSize: formatBytes((performance as any).memory.usedJSHeapSize),
      totalJSHeapSize: formatBytes((performance as any).memory.totalJSHeapSize),
      jsHeapSizeLimit: formatBytes((performance as any).memory.jsHeapSizeLimit),
    };
  }
  return null;
};

// Network quality detection
export const getNetworkQuality = (): any => {
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData,
    };
  }
  return null;
};