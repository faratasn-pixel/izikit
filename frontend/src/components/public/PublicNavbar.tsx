'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Home, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PublicMobileDrawer } from './PublicMobileDrawer';

export type PublicNavKey = 'accueil' | 'annonces' | 'agents' | 'demande' | 'blog' | 'contact';

export const NAV_LINKS: { key: PublicNavKey; label: string; href: string | null }[] = [
  { key: 'accueil', label: 'Accueil', href: '/' },
  { key: 'annonces', label: 'Annonces', href: '/annonces' },
  { key: 'demande', label: 'Demande', href: '/demande-immobiliere' },
  { key: 'agents', label: 'Agents', href: '/agents' },
  { key: 'blog', label: 'Blog', href: '/blog' },
  { key: 'contact', label: 'Contact', href: '/contact' },
];

function InertNavLink({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span title="Bientôt disponible" className={cn('cursor-not-allowed select-none', className)}>
      {children}
    </span>
  );
}

export function PublicNavbar({ active }: { active: PublicNavKey }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="border-b border-black/[0.06]">
      <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between gap-6 px-4 lg:px-7">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-brand">
            <Home className="h-[14px] w-[14px] text-white" aria-hidden />
          </div>
          <span className="font-sora text-[21px] font-bold tracking-[-0.03em]">HABITAT-AFRIK</span>
        </Link>
        <div className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((link) =>
            link.href ? (
              <Link
                key={link.key}
                href={link.href}
                className={cn(
                  'text-sm whitespace-nowrap',
                  active === link.key ? 'font-semibold text-brand' : 'font-medium text-gray-500',
                )}
              >
                {link.label}
              </Link>
            ) : (
              <InertNavLink
                key={link.key}
                className={cn(
                  'text-sm whitespace-nowrap',
                  active === link.key ? 'font-semibold text-brand' : 'font-medium text-gray-500',
                )}
              >
                {link.label}
              </InertNavLink>
            ),
          )}
        </div>
        <div className="flex items-center gap-3.5">
          <Link href="/login" className="hidden text-sm font-medium text-brand lg:inline">
            Connexion
          </Link>
          <Link
            href="/listings/new"
            className="hidden rounded-full bg-brand px-[18px] py-[11px] text-sm font-semibold text-white lg:inline-flex"
          >
            Publier une annonce
          </Link>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Ouvrir le menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 text-neutral-900 lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>

      <PublicMobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} active={active} />
    </div>
  );
}
