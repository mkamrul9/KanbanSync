import React from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-[10px]
        bg-[--ks-border] animate-pulse
        ${className}
      `}
    />
  );
}

export function SkeletonShimmer({ className = '' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-[10px] bg-[--ks-border] ${className}`}>
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)' }}
      />
    </div>
  );
}

export default Skeleton;
