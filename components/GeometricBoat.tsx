import React from 'react';
import { Theme } from '../types';

interface GeometricBoatProps {
  className?: string;
  theme: Theme;
}

export const GeometricBoat: React.FC<GeometricBoatProps> = ({ className, theme }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <polygon
      points="20,70 80,70 65,85 35,85"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <line
      x1="50"
      y1="18"
      x2="50"
      y2="70"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      className={theme === 'light' ? 'text-cyan-600' : 'text-indigo-500'}
    />
    <polygon
      points="52,22 52,65 76,65"
      fill="#0891b2"
      fillOpacity="0.4"
      stroke="#06b6d4"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <polygon
      points="48,32 48,65 30,65"
      fill="#0891b2"
      fillOpacity="0.1"
      stroke="#06b6d4"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);
