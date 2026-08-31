/* eslint-disable @next/next/no-img-element */
import React from 'react';

export function BrandLogo({ className }: { className?: string }) {
  return (
    <img 
      src="/logo-monogram.png" 
      alt="Cássio Miguel Logo"
      className={`object-contain ${className}`}
    />
  );
}
