import React from 'react';
import { Skeleton } from '../../components/ui/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[--ks-bg-base] flex flex-col">
      {/* Navbar skeleton */}
      <div className="h-14 border-b border-[--ks-border] bg-[--ks-bg-elevated] px-6 flex items-center justify-between">
        <Skeleton className="h-6 w-32 rounded-lg" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>

        {/* Board cards grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-44 rounded-[14px] bg-[--ks-bg-card] border border-[--ks-border] p-5 flex flex-col justify-between shadow-sm"
            >
              <div className="space-y-3">
                <Skeleton className="h-5 w-3/4 rounded-md" />
                <Skeleton className="h-3 w-full rounded-sm" />
                <Skeleton className="h-3 w-1/2 rounded-sm" />
              </div>
              <div className="flex items-center justify-between pt-2">
                <Skeleton className="h-3 w-20 rounded-sm" />
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
