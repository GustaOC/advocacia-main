import React from 'react';

export function BrandLogo({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      {/* Outer arc */}
      <path d="M 61.65 6.53 A 45 45 0 1 0 88.97 27.50" />
      
      {/* Inner arc */}
      <path d="M 43.40 12.57 A 38 38 0 0 0 25.57 79.11" />
      
      {/* N shape */}
      <path d="M 25.57 79.11 L 43.40 12.57 L 72.50 88.97 L 88.97 27.50" />
    </svg>
  );
}
