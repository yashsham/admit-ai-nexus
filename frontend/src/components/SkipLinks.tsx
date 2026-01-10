import React from 'react';

export const SkipLinks = () => {
  return (
    <div className="sr-only focus:not-sr-only">
      <a
        href="#main-content"
        className="fixed top-0 left-0 z-[9999] bg-primary text-primary-foreground px-4 py-2 rounded-br-md focus:outline-none focus:ring-2 focus:ring-ring"
        onFocus={(e) => {
          e.currentTarget.classList.remove('sr-only');
        }}
        onBlur={(e) => {
          e.currentTarget.classList.add('sr-only');
        }}
      >
        Skip to main content
      </a>
      <a
        href="#navigation"
        className="fixed top-0 left-0 z-[9999] bg-primary text-primary-foreground px-4 py-2 rounded-br-md focus:outline-none focus:ring-2 focus:ring-ring ml-32"
        onFocus={(e) => {
          e.currentTarget.classList.remove('sr-only');
        }}
        onBlur={(e) => {
          e.currentTarget.classList.add('sr-only');
        }}
      >
        Skip to navigation
      </a>
    </div>
  );
};

// Screen reader only utility component
export const ScreenReaderOnly = ({ 
  children, 
  as: Component = 'span' 
}: { 
  children: React.ReactNode;
  as?: keyof JSX.IntrinsicElements;
}) => {
  return (
    <Component className="sr-only">
      {children}
    </Component>
  );
};

// Visually hidden but accessible content
export const VisuallyHidden = ({ 
  children 
}: { 
  children: React.ReactNode 
}) => {
  return (
    <span className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0">
      {children}
    </span>
  );
};