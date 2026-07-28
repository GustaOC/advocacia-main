import React from 'react';

export function BrandLogo({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="-105 -105 210 210" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      {/* Círculo Externo */}
      <circle cx="0" cy="0" r="100" />
      
      {/* Arco Interno: 278° a 67° (sentido horário) */}
      <path d="M 12.386 88.134 A 89 89 0 1 1 34.775 -81.925" />
      
      {/* Linhas internas estilizadas */}
      <path d="M -31 72 L -6 -63 L 34 75 L 81 -29" />
    </svg>
  );
}
