import Link from 'next/link';
import { LayoutDashboard, MessageCircle, Building2, BellRing, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BottomNavKey = 'dashboard' | 'messages' | 'listings' | 'alerts' | 'settings';

interface BottomNavEntry {
  key: BottomNavKey;
  label: string;
  icon: typeof LayoutDashboard;
  href?: string; // omitted = not built yet, tab is inert
}

// Mirrors the Banani "Dashboard Mobile" bottom nav order. Kept as its own
// fixed 5-item set rather than reusing the desktop sidebar's NAV_GROUPS —
// the two navs don't share the same items (no "Alerte secteur" entry point
// exists in the desktop sidebar) and forcing one shared config would need
// more mapping logic than just declaring both directly.
const BOTTOM_NAV: BottomNavEntry[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { key: 'messages', label: 'Messages', icon: MessageCircle, href: '/messages' },
  { key: 'listings', label: 'Annonces', icon: Building2, href: '/listings' },
  { key: 'alerts', label: 'Alerte secteur', icon: BellRing },
  { key: 'settings', label: 'Paramètres', icon: Settings, href: '/settings' },
];

export function BottomNav({ active }: { active: BottomNavKey }) {
  return (
    <nav className="fixed right-0 bottom-0 left-0 z-20 flex items-center justify-around border-t border-black/[0.06] bg-white px-1 pt-2.5 pb-3 lg:hidden">
      {BOTTOM_NAV.map((entry) => {
        const Icon = entry.icon;
        const isActive = active === entry.key;
        const content = (
          <>
            <Icon className="h-5 w-5" aria-hidden />
            <span className="text-center text-[10px] leading-tight font-medium whitespace-nowrap">
              {entry.label}
            </span>
          </>
        );
        const className = cn(
          'flex flex-1 flex-col items-center gap-0.5 px-1',
          isActive ? 'font-semibold text-brand' : 'text-gray-400',
        );
        return entry.href ? (
          <Link key={entry.key} href={entry.href} className={className}>
            {content}
          </Link>
        ) : (
          <div key={entry.key} className={cn(className, 'cursor-not-allowed')} aria-disabled="true">
            {content}
          </div>
        );
      })}
    </nav>
  );
}
