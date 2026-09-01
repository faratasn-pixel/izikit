'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Home, LogOut, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { NAV_GROUPS, type NavEntry, type NavKey } from './nav-config';

function DrawerNavItem({
  entry,
  active,
  onNavigate,
}: {
  entry: NavEntry;
  active: boolean;
  onNavigate: () => void;
}) {
  const Icon = entry.icon;
  const content = (
    <>
      <Icon className="h-[18px] w-[18px] flex-shrink-0" aria-hidden />
      <span className="flex-1 truncate">{entry.label}</span>
      {!entry.href && (
        <span className="flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-400">
          Bientôt
        </span>
      )}
    </>
  );
  const className = cn(
    'mx-2 my-0.5 flex items-center gap-3 rounded-lg px-3.5 py-3 text-[14px] font-medium',
    active
      ? 'bg-brand/10 text-brand'
      : entry.href
        ? 'text-neutral-700 active:bg-gray-50'
        : 'text-gray-400',
  );
  if (!entry.href) {
    return (
      <div className={className} aria-disabled="true">
        {content}
      </div>
    );
  }
  return (
    <Link href={entry.href} className={className} onClick={onNavigate}>
      {content}
    </Link>
  );
}

export function MobileNavDrawer({
  open,
  onClose,
  active,
}: {
  open: boolean;
  onClose: () => void;
  active: NavKey;
}) {
  const { logout } = useAuth();

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-40 lg:hidden',
        open ? 'pointer-events-auto' : 'pointer-events-none',
      )}
      aria-hidden={!open}
    >
      {/* Overlay */}
      <div
        className={cn(
          'absolute inset-0 bg-black/40 transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        className={cn(
          'absolute top-0 left-0 flex h-full w-[280px] max-w-[85vw] flex-col bg-white shadow-xl transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-[64px] flex-shrink-0 items-center justify-between border-b border-black/[0.06] px-4">
          <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
            <div className="flex h-[30px] w-[30px] items-center justify-center rounded-md bg-brand">
              <Home className="h-[15px] w-[15px] text-white" aria-hidden />
            </div>
            <span className="font-sora text-[14px] font-semibold tracking-[0.3px] text-neutral-900">
              HABITAT-AFRIK
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 active:bg-gray-50"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-1">
              <p className="font-sora px-5 pt-2.5 pb-1 text-[10px] font-semibold tracking-[0.8px] text-gray-400 uppercase">
                {group.label}
              </p>
              {group.items.map((entry) => (
                <DrawerNavItem
                  key={entry.key}
                  entry={entry}
                  active={active === entry.key}
                  onNavigate={onClose}
                />
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t border-black/[0.06] p-2 pb-[calc(env(safe-area-inset-bottom)+8px)]">
          <button
            type="button"
            onClick={() => void logout()}
            className="mx-2 flex w-[calc(100%-16px)] items-center gap-3 rounded-lg px-3.5 py-3 text-[14px] font-medium text-red-600 active:bg-red-50"
          >
            <LogOut className="h-[18px] w-[18px]" aria-hidden />
            Déconnexion
          </button>
        </div>
      </aside>
    </div>
  );
}
