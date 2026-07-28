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
      {/* Outer arc: Starts near top-center, goes counter-clockwise to bottom-right vertex */}
      <path d="M 65.0 7.6 A 45 45 0 1 0 82.6 81.0" />
      
      {/* Inner arc: Starts at top vertex, goes counter-clockwise to intersect left leg */}
      <path d="M 50.0 15.0 A 35 35 0 0 0 25.9 75.3" />
      
      {/* N/M shape: Left leg, Diagonal, Right leg */}
      <path d="M 21.9 85.2 L 50.0 15.0 L 82.6 81.0 L 95.0 50.0" />
    </svg>
  );
}
