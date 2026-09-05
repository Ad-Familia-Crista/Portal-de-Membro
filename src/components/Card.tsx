import React from 'react';
import { cn } from '../utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  titleClassName?: string;
}

export const Card: React.FC<CardProps> = ({ children, className, title, titleClassName }) => {
  return (
    <div className={cn('bg-white rounded-xl card-shadow border border-[#E5E1DA] p-4 sm:p-6', className)}>
      {title && (
        <div className="relative border-b border-[#E5E1DA] pb-2.5 mb-4">
          <h3 className={cn("text-lg sm:text-xl font-display font-bold text-[#111111]", titleClassName)}>{title}</h3>
          <div className="absolute -bottom-[1px] left-0 w-12 h-[2px] bg-[#EAAA00] rounded-full" />
        </div>
      )}
      {children}
    </div>
  );
};
