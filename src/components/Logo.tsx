import React from 'react';
import { cn } from '../utils';

interface LogoProps {
  className?: string;
  variant?: 'full' | 'icon';
}

export const Logo: React.FC<LogoProps> = ({ className, variant = 'full' }) => {
  // Utilizando a logo oficial enviada
  const logoUrl = "/logo-adfc.png";

  return (
    <div className={cn(
      "flex flex-col items-center justify-center overflow-hidden", 
      variant === 'icon' ? "w-12 h-12" : "w-24 h-24",
      className
    )}>
      <img 
        src={logoUrl} 
        alt="Assembleia de Deus Família Cristã" 
        className="w-full h-full object-contain"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
