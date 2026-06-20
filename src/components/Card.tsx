import React from 'react';
import { cn } from '../utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const Card: React.FC<CardProps> = ({ children, className, title }) => {
  return (
    <div className={cn('bg-white rounded-lg card-shadow p-6', className)}>
      {title && <h3 className="text-xl font-display font-bold text-primary mb-4 border-b border-muted/10 pb-2">{title}</h3>}
      {children}
    </div>
  );
};
