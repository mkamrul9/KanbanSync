'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Layout, HelpCircle, Home, Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

type CommandItem = {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  onSelect: () => void;
  group: 'navigation' | 'actions' | 'theme';
};

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { theme, toggle: toggleTheme } = useTheme();

  // Open on Cmd+K / Ctrl+K or custom event
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
        setQuery('');
        setSelected(0);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    const openEvent = () => {
      setOpen(true);
      setQuery('');
      setSelected(0);
    };

    window.addEventListener('keydown', handler);
    window.addEventListener('ks-open-command-palette', openEvent);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('ks-open-command-palette', openEvent);
    };
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const items: CommandItem[] = [
    {
      id: 'dashboard',
      label: 'Go to Dashboard',
      description: 'View all your boards and workspaces',
      icon: <Layout className="w-4 h-4" />,
      onSelect: () => router.push('/dashboard'),
      group: 'navigation',
    },
    {
      id: 'theme',
      label: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
      description: 'Toggle between dark and light themes',
      icon: theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-[--ks-primary]" />,
      onSelect: () => toggleTheme(),
      group: 'theme',
    },
    {
      id: 'help',
      label: 'Help & Support',
      description: 'Get help and guides for KanbanSync',
      icon: <HelpCircle className="w-4 h-4" />,
      onSelect: () => router.push('/help'),
      group: 'navigation',
    },
    {
      id: 'about',
      label: 'About KanbanSync',
      description: 'Learn more about the platform',
      icon: <Home className="w-4 h-4" />,
      onSelect: () => router.push('/about'),
      group: 'navigation',
    },
  ];

  const filtered = query.trim()
    ? items.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.description?.toLowerCase().includes(query.toLowerCase())
      )
    : items;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, Math.max(0, filtered.length - 1)));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selected]) {
        filtered[selected].onSelect();
        setOpen(false);
      }
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-tour-fade" />

      {/* Palette Container */}
      <div
        className="relative w-full max-w-lg rounded-[16px] bg-[--ks-bg-elevated] border border-[--ks-border] shadow-2xl overflow-hidden animate-ks-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search header */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-[--ks-border]">
          <Search className="w-4 h-4 text-[--ks-text-muted] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search (Ctrl+K)..."
            className="flex-1 bg-transparent text-sm text-[--ks-text-primary] placeholder:text-[--ks-text-muted] outline-none"
          />
          <kbd className="text-[11px] text-[--ks-text-muted] border border-[--ks-border] rounded px-1.5 py-0.5 font-mono">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[320px] overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-[--ks-text-muted] text-center py-8">No results found</p>
          ) : (
            filtered.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onMouseEnter={() => setSelected(idx)}
                onClick={() => {
                  item.onSelect();
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-left transition-colors cursor-pointer ${
                  idx === selected
                    ? 'bg-[--ks-primary-subtle] text-[--ks-text-primary]'
                    : 'text-[--ks-text-secondary] hover:bg-[--ks-bg-overlay]'
                }`}
              >
                <span className={`shrink-0 ${idx === selected ? 'text-[--ks-primary]' : 'text-[--ks-text-muted]'}`}>
                  {item.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-none truncate">{item.label}</p>
                  {item.description && (
                    <p className="text-xs text-[--ks-text-muted] mt-1 truncate">{item.description}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-[--ks-border] bg-[--ks-bg-overlay]/50 text-[11px] text-[--ks-text-muted]">
          <span className="flex items-center gap-1">
            <kbd className="border border-[--ks-border] rounded px-1 font-mono">↑↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="border border-[--ks-border] rounded px-1 font-mono">↵</kbd> select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="border border-[--ks-border] rounded px-1 font-mono">Esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
