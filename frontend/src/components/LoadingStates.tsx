import React from 'react';
import { Loader2, Brain } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Basic loading spinner
export const LoadingSpinner = ({ size = 'default', className = '' }: { 
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    default: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <Loader2 className={`animate-spin ${sizeClasses[size]} ${className}`} />
  );
};

// Full page loading state
export const PageLoading = ({ message = 'Loading...' }: { message?: string }) => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-ai-gradient rounded-lg flex items-center justify-center mx-auto animate-pulse">
          <Brain className="w-8 h-8 text-white" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">{message}</h2>
          <div className="flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    </div>
  );
};

// Skeleton loaders for different content types
export const CardSkeleton = () => {
  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center space-x-4">
        <Skeleton className="w-12 h-12 rounded-lg" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
      </div>
    </Card>
  );
};

export const DashboardSkeleton = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6 space-y-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-4 w-32" />
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
};

export const TableSkeleton = ({ rows = 5, columns = 4 }: { 
  rows?: number; 
  columns?: number; 
}) => {
  return (
    <div className="space-y-4">
      <div className="flex space-x-4">
        {[...Array(columns)].map((_, i) => (
          <Skeleton key={i} className="h-6 flex-1" />
        ))}
      </div>
      {[...Array(rows)].map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4">
          {[...Array(columns)].map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
};

// Button loading state
export const ButtonLoading = ({ 
  children, 
  isLoading, 
  disabled,
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  isLoading?: boolean;
  children: React.ReactNode;
}) => {
  return (
    <button 
      {...props} 
      disabled={disabled || isLoading}
      className={`relative ${props.className || ''}`}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner size="sm" />
        </div>
      )}
      <span className={isLoading ? 'opacity-0' : 'opacity-100'}>
        {children}
      </span>
    </button>
  );
};

// Inline loading for specific sections
export const InlineLoading = ({ 
  message = 'Loading...', 
  className = '' 
}: { 
  message?: string; 
  className?: string; 
}) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <LoadingSpinner size="sm" />
      <span className="text-sm text-muted-foreground">{message}</span>
    </div>
  );
};

// Loading overlay for existing content
export const LoadingOverlay = ({ 
  isLoading, 
  children, 
  message = 'Loading...' 
}: {
  isLoading: boolean;
  children: React.ReactNode;
  message?: string;
}) => {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="text-center space-y-2">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        </div>
      )}
    </div>
  );
};