'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from './ThemeProvider';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="w-[54px] h-7 rounded-full bg-[--ks-bg-card] border border-[--ks-border] opacity-60 shrink-0"
        aria-hidden="true"
      />
    );
  }

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={toggle}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Current: ${isDark ? 'Dark' : 'Light'} mode (click to toggle)`}
      className={`
        relative inline-flex items-center w-[54px] h-7 rounded-full p-[2px]
        transition-all duration-200 shrink-0 cursor-pointer outline-none
        focus-visible:ring-2 focus-visible:ring-[--ks-primary]/50 border
        ${isDark
          ? 'bg-[#1E2338] border-[#383F66] hover:border-indigo-400/60 shadow-inner'
          : 'bg-[#E2E8F0] border-[#CBD5E1] hover:border-amber-400/60 shadow-inner'
        }
      `}
    >
      {/* Sliding thumb */}
      <span
        className={`
          flex items-center justify-center w-[22px] h-[22px] rounded-full
          transition-transform duration-200 ease-out
          ${isDark
            ? 'translate-x-[26px] bg-[#0F111D] text-indigo-300 border border-[#434B75] shadow-sm'
            : 'translate-x-0 bg-white text-amber-500 border border-slate-200 shadow-sm shadow-slate-900/10'
          }
        `}
      >
        {isDark ? (
          <Moon className="w-3.5 h-3.5 stroke-[2.2] text-indigo-200 fill-indigo-400/25" />
        ) : (
          <Sun className="w-3.5 h-3.5 stroke-[2.2] text-amber-500 fill-amber-400/25" />
        )}
      </span>
    </button>
  );
}
