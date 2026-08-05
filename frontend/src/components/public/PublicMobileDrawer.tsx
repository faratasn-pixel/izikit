'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Home, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_LINKS, type PublicNavKey } from './PublicNavbar';

function DrawerLink({
  label,
  href,
  active,
  onNavigate,
}: {
  label: string;
  href: string | null;
  active: boolean;
  onNavigate: () => void;
}) {
  const className = cn(
    'mx-2 my-0.5 flex items-center justify-between gap-3 rounded-lg px-3.5 py-3 text-[15px] font-medium',
    active
      ? 'bg-brand/10 text-brand'
      : href
        ? 'text-neutral-700 active:bg-gray-50'
        : 'text-gray-400',
  );
  if (!href) {
    return (
      <div className={className} aria-disabled="true" title="Bientôt disponible">
        {label}
        <span className="flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-400">
          Bientôt
        </span>
      </div>
    );
  }
  return (
    <Link href={href} className={className} onClick={onNavigate}>
      {label}
    </Link>
  );
}

export function PublicMobileDrawer({
  open,
  onClose,
  active,
}: {
  open: boolean;
  onClose: () => void;
  active: PublicNavKey;
}) {
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
          <Link href="/" className="flex items-center gap-2.5" onClick={onClose}>
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
          {NAV_LINKS.map((link) => (
            <DrawerLink
              key={link.key}
              label={link.label}
              href={link.href}
              active={active === link.key}
              onNavigate={onClose}
            />
          ))}
        </nav>

        <div className="flex flex-col gap-2 border-t border-black/[0.06] p-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
          <Link
            href="/login"
            onClick={onClose}
            className="flex items-center justify-center rounded-full border border-black/[0.08] px-4 py-3 text-sm font-semibold text-brand"
          >
            Connexion
          </Link>
          <div
            title="Bientôt disponible"
            className="flex cursor-not-allowed items-center justify-center rounded-full bg-brand/40 px-4 py-3 text-sm font-semibold text-white select-none"
          >
            Publier une annonce
          </div>
        </div>
      </aside>
    </div>
  );
}
