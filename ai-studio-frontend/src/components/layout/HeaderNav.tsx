import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  BookOpen,
  ArrowDownToLine,
  Settings,
  Sun,
  Moon,
  Laptop,
  ChevronDown,
  Check,
} from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';
import { ThemeMode } from '../../types';

interface HeaderNavProps {
  activeNavTab: string;
  onSelectNavTab: (tab: string) => void;
  downloadsCount?: number;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  activeNavTab,
  onSelectNavTab,
  downloadsCount = 3,
}) => {
  const { themeMode, resolvedTheme, setThemeMode } = useTheme();
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        themeMenuRef.current &&
        !themeMenuRef.current.contains(event.target as Node)
      ) {
        setIsThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { id: 'find', label: 'Find', icon: Search },
    { id: 'library', label: 'Library', icon: BookOpen },
    {
      id: 'downloads',
      label: 'Downloads',
      icon: ArrowDownToLine,
      badge: downloadsCount,
    },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const themeOptions: { mode: ThemeMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { mode: 'light', label: 'Light', icon: Sun },
    { mode: 'dark', label: 'Dark', icon: Moon },
    { mode: 'system', label: 'System', icon: Laptop },
  ];

  return (
    <header className="sticky top-0 z-40 shrink-0 w-full border-b border-[var(--app-border)] bg-[var(--app-bg)] transition-colors select-none">
      <div className="max-w-[1375px] mx-auto px-6 h-[68px] flex items-center justify-between">
        {/* Brand Wordmark */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => onSelectNavTab('find')}
            className="font-serif font-bold text-[26px] tracking-tight text-[var(--app-text-primary)] cursor-pointer text-left"
          >
            Castbox Downloader
          </button>
        </div>

        {/* Center Navigation Links */}
        <nav className="flex items-center h-full space-x-1 sm:space-x-3 md:space-x-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNavTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectNavTab(item.id)}
                  className={`relative flex items-center gap-2 h-full px-2 text-base font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'text-[var(--app-accent)]'
                    : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)]'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-[var(--app-accent)] stroke-[2.2]' : 'stroke-[1.8]'
                  }`}
                />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="inline-flex items-center justify-center px-1.5 py-0.2 text-[11px] font-semibold text-white bg-[var(--app-accent)] rounded-full leading-tight min-w-[18px] h-[18px]">
                    {item.badge}
                  </span>
                )}
                {/* Active indicator bar aligned with bottom border */}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--app-accent)] rounded-t-sm" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Zone: Theme Dropdown Menu */}
        <div className="relative" ref={themeMenuRef}>
          <button
            onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 text-base font-medium text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] rounded-lg transition-colors cursor-pointer"
            aria-label="Theme selector"
            aria-expanded={isThemeMenuOpen}
          >
            {resolvedTheme === 'dark' ? (
              <Moon className="w-4.5 h-4.5 text-[var(--app-text-secondary)] stroke-[1.8]" />
            ) : (
              <Sun className="w-4.5 h-4.5 text-[var(--app-text-secondary)] stroke-[1.8]" />
            )}
            <span>Theme</span>
            <ChevronDown
              className={`w-3.5 h-3.5 opacity-80 transition-transform duration-150 ${
                isThemeMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Persistent Theme Selection Dropdown matching reference mockups */}
          {isThemeMenuOpen && (
            <div className="absolute right-0 mt-2 w-44 p-1.5 bg-[var(--app-bg)] border border-[var(--app-border)] rounded-2xl shadow-xl shadow-black/10 dark:shadow-black/40 z-50 animate-in fade-in zoom-in-95 duration-100">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = themeMode === opt.mode;
                return (
                  <button
                    key={opt.mode}
                    onClick={() => {
                      setThemeMode(opt.mode);
                      setIsThemeMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-medium rounded-xl text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'text-[var(--app-text-primary)] bg-black/[0.04] dark:bg-white/[0.06]'
                        : 'text-[var(--app-text-primary)] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4.5 h-4.5 ${isSelected ? 'text-[var(--app-accent)]' : 'text-[var(--app-text-secondary)]'}`} />
                      <span>{opt.label}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[var(--app-accent)] stroke-[2.5]" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
