'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import {
  Home,
  Search,
  LayoutDashboard,
  MessageCircle,
  Settings,
  Building2,
  Users,
  CalendarCheck,
  Coins,
  BarChart2,
  LifeBuoy,
  LogOut,
  Bell,
  ChevronDown,
} from 'lucide-react';
import { useUser, useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/lib/useApi';
import { InitialsAvatar } from './InitialsAvatar';
import { MobileTopbar } from './MobileTopbar';
import { BottomNav } from './BottomNav';
import { cn } from '@/lib/utils';

type NavKey =
  | 'dashboard'
  | 'messages'
  | 'settings'
  | 'listings'
  | 'contacts'
  | 'visits'
  | 'tokens'
  | 'stats'
  | 'help';

interface NavEntry {
  key: NavKey;
  label: string;
  icon: typeof Home;
  href?: string; // omitted = not built yet, renders inert with a "Bientôt" tag
}

const NAV_GROUPS: { label: string; items: NavEntry[] }[] = [
  {
    label: 'Navigation',
    items: [
      { key: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, href: '/dashboard' },
      { key: 'messages', label: 'Messages', icon: MessageCircle },
      { key: 'settings', label: 'Paramètres', icon: Settings, href: '/settings' },
    ],
  },
  {
    label: 'Gestion',
    items: [
      { key: 'listings', label: 'Mes annonces', icon: Building2, href: '/listings' },
      { key: 'contacts', label: 'Contacts reçus', icon: Users },
      { key: 'visits', label: 'Visites programmées', icon: CalendarCheck },
      { key: 'tokens', label: 'Jetons & visites VR', icon: Coins },
    ],
  },
  {
    label: 'Outils',
    items: [
      { key: 'stats', label: 'Statistiques', icon: BarChart2 },
      { key: 'help', label: "Centre d'aide", icon: LifeBuoy },
    ],
  },
];

const ROLE_LABEL: Record<string, string> = {
  OWNER_AGENT: 'Agent',
  TENANT_BUYER: 'Locataire / Acheteur',
};

// The mobile bottom nav has its own fixed 5-tab set (mirrors Banani's
// "Dashboard Mobile"), distinct from the desktop sidebar's NAV_GROUPS —
// only the overlapping keys need a mapping, everything else falls back to
// "dashboard" since it's the only page actually built today.
const BOTTOM_NAV_KEY_MAP: Partial<
  Record<NavKey, 'dashboard' | 'messages' | 'listings' | 'settings'>
> = {
  dashboard: 'dashboard',
  messages: 'messages',
  listings: 'listings',
  settings: 'settings',
};

function NavItem({ entry, active }: { entry: NavEntry; active: boolean }) {
  const Icon = entry.icon;
  const content = (
    <>
      <Icon className="h-[17px] w-[17px] flex-shrink-0" aria-hidden />
      <span className="flex-1 truncate">{entry.label}</span>
      {!entry.href && (
        <span className="flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-400">
          Bientôt
        </span>
      )}
    </>
  );
  const className = cn(
    'mx-2 my-0.5 flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-[13.5px] font-medium',
    active
      ? 'bg-brand/10 text-brand'
      : entry.href
        ? 'text-neutral-700 hover:bg-gray-50'
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
    <Link href={entry.href} className={className}>
      {content}
    </Link>
  );
}

export function DashboardShell({
  active,
  searchPlaceholder = 'Rechercher une annonce, un contact…',
  children,
}: {
  active: NavKey;
  searchPlaceholder?: string;
  children: ReactNode;
}) {
  const user = useUser();
  const { logout } = useAuth();
  const { data: notif } = useApi<{ count: number }>('/api/notifications/count');

  if (!user) return null;
  const roleLabel = ROLE_LABEL[user.accountType] ?? user.accountType;
  const unread = notif?.count ?? 0;

  return (
    <div className="flex min-h-screen bg-[#F4F6FB]">
      {/* SIDEBAR — desktop only, replaced by MobileTopbar + BottomNav below lg: */}
      <aside className="hidden w-[248px] flex-shrink-0 flex-col border-r border-black/[0.06] bg-white lg:flex">
        <Link
          href="/dashboard"
          className="flex h-[74px] items-center gap-2.5 border-b border-black/[0.06] px-5"
        >
          <div className="flex h-[34px] w-[34px] items-center justify-center rounded-md bg-brand">
            <Home className="h-[18px] w-[18px] text-white" aria-hidden />
          </div>
          <span className="font-sora text-[15px] font-semibold tracking-[0.3px] text-neutral-900">
            HABITAT-AFRIK
          </span>
        </Link>

        <div className="mx-3.5 mt-3.5 mb-2 flex items-center gap-2 rounded-lg border border-black/[0.06] bg-gray-50 px-3 py-2">
          <Search className="h-[15px] w-[15px] text-gray-400" aria-hidden />
          <span className="text-[13px] text-gray-400">Recherche globale…</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-1">
              <p className="font-sora px-5 pt-2.5 pb-1 text-[10px] font-semibold tracking-[0.8px] text-gray-400 uppercase">
                {group.label}
              </p>
              {group.items.map((entry) => (
                <NavItem key={entry.key} entry={entry} active={active === entry.key} />
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t border-black/[0.06] p-2">
          <button
            type="button"
            onClick={() => void logout()}
            className="mx-2 flex w-[calc(100%-16px)] items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-[13.5px] font-medium text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-[17px] w-[17px]" aria-hidden />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* MAIN AREA */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Desktop topbar — hidden below lg:, replaced by MobileTopbar */}
        <div className="hidden h-[74px] items-center gap-4 border-b border-black/[0.06] bg-white px-7 lg:flex">
          <div className="flex max-w-[380px] flex-1 items-center gap-2 rounded-lg border border-black/[0.06] bg-gray-50 px-3.5 py-2">
            <Search className="h-[15px] w-[15px] text-gray-400" aria-hidden />
            <span className="text-[13px] text-gray-400">{searchPlaceholder}</span>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50">
              <Bell className="h-[18px] w-[18px] text-neutral-700" aria-hidden />
              {unread > 0 && (
                <span className="absolute top-1 right-1 flex h-[9px] w-[9px] items-center justify-center rounded-full border-2 border-white bg-red-500" />
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <InitialsAvatar
                name={user.name}
                email={user.email}
                avatarUrl={user.avatarUrl}
                size={34}
              />
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] font-semibold whitespace-nowrap text-neutral-900">
                  {user.name ?? user.email}
                </span>
                <span className="inline-block w-fit rounded-full bg-brand/10 px-2 py-px text-[10px] font-semibold whitespace-nowrap text-brand">
                  {roleLabel}
                </span>
              </div>
              <ChevronDown className="ml-0.5 h-3.5 w-3.5 text-gray-400" aria-hidden />
            </div>
          </div>
        </div>

        {/* Mobile topbar — hidden at lg: and up */}
        <div className="lg:hidden">
          <MobileTopbar user={user} unreadCount={unread} />
        </div>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4 pb-[88px] lg:p-7 lg:pb-7">
          {children}
        </div>
      </div>

      <BottomNav active={BOTTOM_NAV_KEY_MAP[active] ?? 'dashboard'} />
    </div>
  );
}
