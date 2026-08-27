import {
  Home,
  LayoutDashboard,
  MessageCircle,
  Settings,
  Building2,
  MapPinned,
  FileSearch,
  Users,
  CalendarCheck,
  Coins,
  BarChart2,
  LifeBuoy,
} from 'lucide-react';

export type NavKey =
  | 'dashboard'
  | 'messages'
  | 'settings'
  | 'listings'
  | 'alerts'
  | 'requests'
  | 'contacts'
  | 'visits'
  | 'tokens'
  | 'stats'
  | 'help';

export interface NavEntry {
  key: NavKey;
  label: string;
  icon: typeof Home;
  href?: string; // omitted = not built yet, renders inert with a "Bientôt" tag
}

export const NAV_GROUPS: { label: string; items: NavEntry[] }[] = [
  {
    label: 'Tableau de bord',
    items: [
      { key: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, href: '/dashboard' },
    ],
  },
  {
    label: 'Activité',
    items: [
      { key: 'listings', label: 'Mes annonces', icon: Building2, href: '/listings' },
      { key: 'contacts', label: 'Contacts reçus', icon: Users, href: '/contacts' },
      { key: 'visits', label: 'Visites programmées', icon: CalendarCheck, href: '/visites' },
      { key: 'requests', label: 'Demande immobilière', icon: FileSearch, href: '/demandes' },
      { key: 'alerts', label: 'Alerte secteur', icon: MapPinned, href: '/alertes' },
      { key: 'messages', label: 'Messages', icon: MessageCircle, href: '/messages' },
    ],
  },
  {
    label: 'Outils',
    items: [
      { key: 'stats', label: 'Statistiques', icon: BarChart2, href: '/statistiques' },
      { key: 'tokens', label: 'Jetons & visites VR', icon: Coins, href: '/jetons' },
    ],
  },
  {
    label: 'Compte',
    items: [
      { key: 'settings', label: 'Paramètres', icon: Settings, href: '/settings' },
      { key: 'help', label: "Centre d'aide", icon: LifeBuoy },
    ],
  },
];
