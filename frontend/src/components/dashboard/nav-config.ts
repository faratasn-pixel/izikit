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
    label: 'Navigation',
    items: [
      { key: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, href: '/dashboard' },
      { key: 'messages', label: 'Messages', icon: MessageCircle, href: '/messages' },
      { key: 'settings', label: 'Paramètres', icon: Settings, href: '/settings' },
    ],
  },
  {
    label: 'Gestion',
    items: [
      { key: 'listings', label: 'Mes annonces', icon: Building2, href: '/listings' },
      { key: 'alerts', label: 'Alerte secteur', icon: MapPinned, href: '/alertes' },
      { key: 'requests', label: 'Demande immobilière', icon: FileSearch, href: '/demandes' },
      { key: 'contacts', label: 'Contacts reçus', icon: Users, href: '/contacts' },
      { key: 'visits', label: 'Visites programmées', icon: CalendarCheck, href: '/visites' },
      { key: 'tokens', label: 'Jetons & visites VR', icon: Coins, href: '/jetons' },
    ],
  },
  {
    label: 'Outils',
    items: [
      { key: 'stats', label: 'Statistiques', icon: BarChart2, href: '/statistiques' },
      { key: 'help', label: "Centre d'aide", icon: LifeBuoy },
    ],
  },
];
