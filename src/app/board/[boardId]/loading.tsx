import React from 'react';
import { Skeleton } from '../../../components/ui/Skeleton';

export default function BoardLoading() {
  return (
    <div className="min-h-screen bg-[--ks-bg-base] flex flex-col overflow-hidden">
      {/* Navbar skeleton */}
      <div className="h-14 border-b border-[--ks-border] bg-[--ks-bg-elevated] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-28 rounded-lg" />
          <Skeleton className="h-4 w-4 rounded-sm" />
          <Skeleton className="h-6 w-36 rounded-lg" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>

      {/* Board columns skeleton */}
      <div className="flex-1 p-6 flex gap-4 overflow-x-auto">
        {[...Array(4)].map((_, col) => (
          <div
            key={col}
            className="w-[280px] shrink-0 rounded-[18px] bg-[--ks-bg-card] border border-[--ks-border] p-4 flex flex-col gap-3 shadow-sm"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[--ks-border]">
              <div className="flex items-center gap-2">
                <Skeleton className="w-2.5 h-2.5 rounded-full" />
                <Skeleton className="h-4 w-24 rounded-md" />
              </div>
              <Skeleton className="h-4 w-6 rounded-full" />
            </div>

            {/* Task cards */}
            {[...Array(col === 0 ? 3 : col === 1 ? 2 : col === 2 ? 4 : 1)].map((_, card) => (
              <div
                key={card}
                className="rounded-[10px] bg-[--ks-bg-elevated] border border-[--ks-border] p-3.5 space-y-2.5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-16 rounded-md" />
                  <Skeleton className="h-5 w-5 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full rounded-sm" />
                <Skeleton className="h-4 w-2/3 rounded-sm" />
                <div className="flex items-center justify-between pt-1">
                  <Skeleton className="h-3 w-12 rounded-sm" />
                  <Skeleton className="h-3 w-16 rounded-sm" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
