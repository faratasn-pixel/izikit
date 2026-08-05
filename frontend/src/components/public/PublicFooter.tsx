'use client';

import Link from 'next/link';
import { Home } from 'lucide-react';
import { cn } from '@/lib/utils';

function InertFooterLink({ children }: { children: React.ReactNode }) {
  return (
    <span
      title="Bientôt disponible"
      className={cn('cursor-not-allowed text-sm text-white/86 select-none')}
    >
      {children}
    </span>
  );
}

const PLATFORM_LINKS: { label: string; href: string | null }[] = [
  { label: 'Parcourir les annonces', href: '/annonces' },
  { label: 'Publier une annonce', href: null },
  { label: 'Devenir agent', href: null },
  { label: 'Nos services', href: null },
];
const COUNTRY_LINKS = ['Bénin', 'Togo', "Côte d'Ivoire", 'Sénégal'];
const HELP_LINKS = ["Centre d'aide", 'FAQ', 'Politique de confidentialité', 'Contact'];

export function PublicFooter() {
  return (
    <footer className="bg-[#0F172A] px-4 pt-11 pb-[30px] text-white/82 lg:px-7">
      <div className="mx-auto max-w-[1280px]">
        <div className="mb-6 grid grid-cols-1 gap-9 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="max-w-[320px]">
            <Link href="/" className="flex items-center gap-3 text-white">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-brand">
                <Home className="h-[14px] w-[14px] text-white" aria-hidden />
              </div>
              <span className="font-sora text-[21px] font-bold tracking-[-0.03em]">
                HABITAT-AFRIK
              </span>
            </Link>
            <p className="mt-3 text-sm text-white/58">
              La plateforme immobilière de référence en Afrique de l&apos;Ouest pour acheter, louer
              et publier des annonces fiables.
            </p>
            <div className="mt-[18px] flex items-center gap-2.5">
              {['f', 'in', 'x'].map((label) => (
                <span
                  key={label}
                  title="Bientôt disponible"
                  className="flex h-[34px] w-[34px] cursor-not-allowed items-center justify-center rounded-full bg-white/[0.08] text-[13px] font-bold select-none"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3.5 text-xs tracking-[0.12em] text-white/52 uppercase">Plateforme</p>
            <div className="flex flex-col gap-2.5">
              {PLATFORM_LINKS.map((l) =>
                l.href ? (
                  <Link key={l.label} href={l.href} className="text-sm text-white/86">
                    {l.label}
                  </Link>
                ) : (
                  <InertFooterLink key={l.label}>{l.label}</InertFooterLink>
                ),
              )}
            </div>
          </div>
          <div>
            <p className="mb-3.5 text-xs tracking-[0.12em] text-white/52 uppercase">Pays</p>
            <div className="flex flex-col gap-2.5">
              {COUNTRY_LINKS.map((l) => (
                <InertFooterLink key={l}>{l}</InertFooterLink>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3.5 text-xs tracking-[0.12em] text-white/52 uppercase">Aide</p>
            <div className="flex flex-col gap-2.5">
              {HELP_LINKS.map((l) => (
                <InertFooterLink key={l}>{l}</InertFooterLink>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-[18px] text-xs text-white/52">
          <p>© 2025 HABITAT-AFRIK. Tous droits réservés.</p>
          <div className="flex flex-wrap items-center gap-4">
            {['FR', 'EN', 'Conditions', 'Confidentialité'].map((l) => (
              <span key={l}>{l}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
