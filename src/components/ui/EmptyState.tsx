import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  message,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-10 px-4 text-center ${className}`}>
      {icon && (
        <span className="w-12 h-12 rounded-full bg-[--ks-bg-card] border border-[--ks-border] flex items-center justify-center text-[--ks-text-muted] shadow-sm">
          {icon}
        </span>
      )}
      <div>
        <p className="text-sm font-semibold text-[--ks-text-primary]">{title}</p>
        {message && <p className="text-xs text-[--ks-text-muted] mt-1 max-w-sm">{message}</p>}
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-1 px-4 py-2 rounded-[10px] text-xs font-medium bg-[--ks-primary] text-white hover:bg-[--ks-primary-hover] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
