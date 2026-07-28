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
      <circle cx="50" cy="50" r="46" />
      <path d="M 58 6 A 40 40 0 0 0 35 90" />
      <path d="M 35 90 L 48 12 L 72 88 L 94 38" />
    </svg>
  );
}
