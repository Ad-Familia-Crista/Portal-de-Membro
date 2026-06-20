import React from 'react';
import { cn } from '../utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, rightIcon, type, ...props }, ref) => {
    // Tipos que NÃO devem ser convertidos para uppercase
    const noUppercase = ['email', 'password', 'date', 'number', 'tel', 'file', 'hidden'];
    const isTextType = !type || !noUppercase.includes(type);
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="text-sm font-semibold text-primary">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            type={type}
            className={cn(
              'flex h-10 w-full rounded-md border border-muted/30 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50',
              rightIcon && 'pr-10',
              isTextType && 'uppercase',
              error && 'border-red-500 focus:ring-red-500/50',
              className
            )}
            autoCapitalize={isTextType ? 'characters' : undefined}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-3 flex items-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);
