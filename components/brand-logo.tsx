import React from 'react';

export function BrandLogo({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      {/* Outer arc */}
      <path d="M 81.8 18.2 A 45 45 0 1 0 72.5 89.0" />
      
      {/* Inner arc */}
      <path d="M 38.4 18.0 A 34 34 0 0 0 23.9 71.9" />
      
      {/* N shape */}
      <path d="M 23.9 71.9 L 38.4 18.0 L 72.5 89.0 L 89.0 27.5" />
    </svg>
  );
}
