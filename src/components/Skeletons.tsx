import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-muted/20 rounded ${className}`} />
);

export const PageSkeleton: React.FC = () => (
  <div className="max-w-4xl mx-auto p-4 space-y-6 animate-pulse">
    <div className="h-14 bg-muted/20 rounded-lg w-full" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="h-8 bg-muted/20 rounded w-1/3" />
        <div className="h-20 bg-muted/15 rounded-lg" />
        <div className="h-20 bg-muted/15 rounded-lg" />
        <div className="h-20 bg-muted/15 rounded-lg" />
      </div>
      <div className="h-80 bg-muted/15 rounded-xl" />
    </div>
  </div>
);

export const MuralSkeleton: React.FC = () => (
  <div className="space-y-3">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-muted/10 bg-background/30 animate-pulse">
        <div className="w-8 h-8 rounded-full bg-muted/20 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted/25 rounded w-3/4" />
          <div className="h-3 bg-muted/15 rounded w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

export const MemberTableSkeleton: React.FC = () => (
  <div className="space-y-3 animate-pulse">
    <div className="h-10 bg-muted/20 rounded-lg w-full" />
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="h-16 bg-muted/10 rounded-lg border border-muted/10 flex items-center px-4 gap-4">
        <div className="w-10 h-10 rounded-full bg-muted/20" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted/20 rounded w-1/3" />
          <div className="h-3 bg-muted/15 rounded w-1/4" />
        </div>
        <div className="w-20 h-6 bg-muted/20 rounded-full" />
      </div>
    ))}
  </div>
);

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-24 bg-muted/15 rounded-xl" />
      ))}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="h-72 bg-muted/15 rounded-xl" />
      <div className="h-72 bg-muted/15 rounded-xl" />
    </div>
  </div>
);
