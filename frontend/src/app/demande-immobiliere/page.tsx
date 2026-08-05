import Link from 'next/link';
import {
  PlusCircle,
  List,
  FileText,
  BadgeCheck,
  Clock,
  Home,
  Building2,
  Map,
  Briefcase,
  Zap,
  Circle,
  HelpCircle,
  ShieldCheck,
  Bell,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PublicNavbar } from '@/components/public/PublicNavbar';
import { PublicFooter } from '@/components/public/PublicFooter';

type ReqType = 'villa' | 'appartement' | 'terrain' | 'bureau';
type ReqStatus = 'active' | 'pending' | 'closed';

interface RecentRequest {
  id: string;
  type: ReqType;
  typeLabel: string;
  typeIcon: typeof Home;
  location: string;
  transaction: string;
  budget: string;
  surface: string;
  status: ReqStatus;
  matches: string | null;
  date: string;
}

const TYPE_STYLE: Record<ReqType, string> = {
  villa: 'bg-brand/10 text-brand',
  appartement: 'bg-violet-100 text-violet-700',
  terrain: 'bg-amber-100 text-amber-700',
  bureau: 'bg-emerald-100 text-emerald-700',
};

const STATUS_STYLE: Record<ReqStatus, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-emerald-100 text-emerald-700' },
  pending: { label: 'En attente', className: 'bg-amber-100 text-amber-700' },
  closed: { label: 'Clôturée', className: 'bg-gray-100 text-gray-600' },
};

const RECENT_REQUESTS: RecentRequest[] = [
  {
    id: 'r1',
    type: 'villa',
    typeLabel: 'Villa',
    typeIcon: Home,
    location: '🇨🇮 Abidjan, Cocody',
    transaction: 'Vente',
    budget: '80M – 200M FCFA',
    surface: '200 m²+',
    status: 'active',
    matches: '3 nouvelles',
    date: '5 jan. 2025',
  },
  {
    id: 'r2',
    type: 'appartement',
    typeLabel: 'Appartement',
    typeIcon: Building2,
    location: '🇸🇳 Dakar, Plateau',
    transaction: 'Location',
    budget: '400K – 700K / mois',
    surface: '80 m²+',
    status: 'active',
    matches: '5 nouvelles',
    date: '8 jan. 2025',
  },
  {
    id: 'r3',
    type: 'terrain',
    typeLabel: 'Terrain',
    typeIcon: Map,
    location: '🇧🇯 Cotonou, Cadjehoun',
    transaction: 'Vente',
    budget: '15M – 35M FCFA',
    surface: '500 m²+',
    status: 'pending',
    matches: null,
    date: '10 jan. 2025',
  },
  {
    id: 'r4',
    type: 'bureau',
    typeLabel: 'Bureau',
    typeIcon: Briefcase,
    location: '🇹🇬 Lomé, Centre',
    transaction: 'Location',
    budget: '250K – 500K / mois',
    surface: '120 m²+',
    status: 'active',
    matches: '2 nouvelles',
    date: '11 jan. 2025',
  },
  {
    id: 'r5',
    type: 'villa',
    typeLabel: 'Villa',
    typeIcon: Home,
    location: '🇸🇳 Saly, Bord de mer',
    transaction: 'Vente',
    budget: '120M – 250M FCFA',
    surface: '300 m²+',
    status: 'closed',
    matches: null,
    date: '2 jan. 2025',
  },
  {
    id: 'r6',
    type: 'appartement',
    typeLabel: 'Appartement',
    typeIcon: Building2,
    location: '🇨🇮 Abidjan, Marcory',
    transaction: 'Location',
    budget: '300K – 600K / mois',
    surface: '100 m²+',
    status: 'active',
    matches: '1 nouvelle',
    date: '12 jan. 2025',
  },
];

const HOW_IT_WORKS = [
  {
    num: '01',
    title: 'Décrivez votre bien',
    text: 'Type de bien, nombre de pièces, superficie, localisation souhaitée, transaction (vente ou location).',
  },
  {
    num: '02',
    title: 'Définissez votre budget',
    text: 'Indiquez votre fourchette de prix en FCFA. Nos filtres de matching respectent vos contraintes financières.',
  },
  {
    num: '03',
    title: 'Agents vous contactent',
    text: 'Les agents certifiés disposant de biens correspondants vous contactent directement sous 48h.',
  },
  {
    num: '04',
    title: 'Concluez en confiance',
    text: 'Visitez les biens sélectionnés, posez des questions et finalisez en toute sécurité avec un agent vérifié.',
  },
];

const FAQ = [
  {
    icon: HelpCircle,
    q: 'Est-ce gratuit de déposer une demande ?',
    a: "Oui, le dépôt d'une demande immobilière est entièrement gratuit pour les particuliers. Seuls les agents payent pour accéder aux coordonnées complètes des demandeurs.",
  },
  {
    icon: ShieldCheck,
    q: 'Mes coordonnées sont-elles protégées ?',
    a: "Vos informations de contact restent privées. Les agents certifiés n'y accèdent qu'après confirmation de votre intérêt. Vos données ne sont jamais partagées publiquement.",
  },
  {
    icon: Clock,
    q: 'Combien de temps reste ma demande active ?',
    a: 'Par défaut, une demande reste active pendant 60 jours. Vous pouvez la prolonger, la mettre en pause ou la clôturer à tout moment depuis votre espace personnel.',
  },
  {
    icon: Bell,
    q: 'Comment suis-je notifié des correspondances ?',
    a: "Vous recevez une notification par email et/ou SMS dès qu'un agent propose un bien correspondant à vos critères. La fréquence est configurable (immédiate, quotidienne, hebdomadaire).",
  },
];

function InertLink({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span title="Bientôt disponible" className={cn('cursor-not-allowed select-none', className)}>
      {children}
    </span>
  );
}

export default function DemandeImmobilierePage() {
  return (
    <div className="bg-white text-neutral-900">
      <PublicNavbar active="demande" />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-sky-500 to-sky-600 px-4 py-16 lg:px-7 lg:py-[72px]">
        <div className="pointer-events-none absolute -top-[120px] -right-20 h-[400px] w-[400px] rounded-full bg-white/[0.06]" />
        <div className="pointer-events-none absolute -bottom-20 left-[60px] h-[280px] w-[280px] rounded-full bg-white/[0.04]" />
        <div className="relative z-[2] mx-auto flex max-w-[1280px] flex-col items-start gap-9 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1 text-white">
            <p className="mb-4 text-[11px] tracking-[0.22em] text-white/74 uppercase">
              Trouvez votre bien idéal
            </p>
            <h1 className="mb-[18px] font-sora text-[34px] leading-[1.08] font-extrabold tracking-[-0.04em] lg:text-[52px]">
              Déposez votre
              <br />
              <em className="text-white/88 not-italic italic">demande immobilière</em>
            </h1>
            <p className="mb-[30px] max-w-[520px] text-[15px] leading-relaxed text-white/88 lg:text-[16px]">
              Décrivez le bien que vous recherchez, et nos agents certifiés vous contactent avec les
              meilleures correspondances disponibles au Bénin, Togo, Côte d&apos;Ivoire et Sénégal.
            </p>
            <div className="flex flex-wrap items-center gap-3.5">
              <Link
                href="/demande-immobiliere/nouvelle"
                className="inline-flex items-center gap-2.5 rounded-full bg-white px-6 py-3.5 text-[15px] font-bold text-brand"
              >
                <PlusCircle className="h-[18px] w-[18px]" aria-hidden />
                Déposer une demande
              </Link>
              <InertLink className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-white/38 px-[22px] py-3.5 text-sm font-semibold text-white">
                <List className="h-4 w-4" aria-hidden />
                Voir mes demandes
              </InertLink>
            </div>
          </div>

          <div className="flex-shrink-0">
            <div className="flex min-w-[260px] flex-col gap-[18px] rounded-[20px] border border-white/18 bg-white/12 p-[26px] backdrop-blur-md">
              {[
                { icon: FileText, val: '320+', label: 'Demandes déposées ce mois' },
                { icon: BadgeCheck, val: '94%', label: 'Taux de correspondance' },
                { icon: Clock, val: '48h', label: 'Délai moyen de réponse agent' },
              ].map((s, i) => (
                <div key={s.label}>
                  {i > 0 && <div className="mb-[18px] h-px w-full bg-white/12" />}
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/16">
                      <s.icon className="h-[18px] w-[18px] text-white" aria-hidden />
                    </div>
                    <div>
                      <p className="mb-0.5 font-sora text-[22px] leading-none font-extrabold tracking-[-0.03em] text-white">
                        {s.val}
                      </p>
                      <p className="text-xs text-white/74">{s.label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-gray-50 px-4 py-[72px] lg:px-7">
        <div className="mx-auto max-w-[1280px]">
          <div className="mx-auto mb-10 max-w-[600px] text-center">
            <p className="mb-2.5 text-xs font-bold tracking-[0.16em] text-brand uppercase">
              Simple et rapide
            </p>
            <h2 className="font-sora mb-2.5 text-[28px] font-extrabold tracking-[-0.04em] lg:text-[40px]">
              Comment ça <span className="text-brand italic">marche</span> ?
            </h2>
            <p className="text-[15px] text-gray-500">
              Déposez votre demande en 3 minutes, laissez nos agents travailler pour vous.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((step) => (
              <div
                key={step.num}
                className="flex flex-col gap-3.5 rounded-2xl border border-black/[0.06] bg-white p-[26px]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-[15px] font-extrabold text-brand">
                  {step.num}
                </div>
                <p className="text-[17px] font-bold">{step.title}</p>
                <p className="text-sm leading-relaxed text-gray-500">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEMANDES RÉCENTES */}
      <section className="px-4 py-[72px] lg:px-7">
        <div className="mx-auto max-w-[1280px]">
          <div className="mb-9 flex flex-col items-start justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="mb-2.5 text-xs font-bold tracking-[0.16em] text-brand uppercase">
                Activité récente
              </p>
              <h2 className="font-sora mb-2.5 text-[28px] font-extrabold tracking-[-0.04em] lg:text-[40px]">
                Demandes en <span className="text-brand italic">cours</span>
              </h2>
              <p className="max-w-[560px] text-[15px] text-gray-500">
                Aperçu anonymisé des recherches actives sur la plateforme.
              </p>
            </div>
            <Link
              href="/demande-immobiliere/nouvelle"
              className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] px-5 py-2.5 text-sm font-semibold whitespace-nowrap text-brand"
            >
              <Plus className="h-[15px] w-[15px]" aria-hidden />
              Déposer ma demande
            </Link>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-black/[0.06]">
            <table className="w-full min-w-[820px]">
              <thead>
                <tr className="border-b border-black/[0.06]">
                  {[
                    'Type de bien',
                    'Localisation',
                    'Transaction',
                    'Budget',
                    'Superficie',
                    'Statut',
                    'Correspondances',
                    'Déposé le',
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-3.5 py-3 text-left text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap text-gray-400 uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RECENT_REQUESTS.map((r, i) => {
                  const status = STATUS_STYLE[r.status];
                  return (
                    <tr
                      key={r.id}
                      className={cn(
                        'border-b border-black/[0.06] last:border-0',
                        i % 2 === 1 && 'bg-gray-50',
                      )}
                    >
                      <td className="px-3.5 py-3.5">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap',
                            TYPE_STYLE[r.type],
                          )}
                        >
                          <r.typeIcon className="h-3 w-3" aria-hidden />
                          {r.typeLabel}
                        </span>
                      </td>
                      <td className="px-3.5 py-3.5 text-[13.5px] whitespace-nowrap">
                        {r.location}
                      </td>
                      <td className="px-3.5 py-3.5 text-[13.5px] font-semibold whitespace-nowrap">
                        {r.transaction}
                      </td>
                      <td className="px-3.5 py-3.5 text-[13.5px] font-semibold whitespace-nowrap">
                        {r.budget}
                      </td>
                      <td className="px-3.5 py-3.5 text-[13.5px] whitespace-nowrap text-gray-500">
                        {r.surface}
                      </td>
                      <td className="px-3.5 py-3.5">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap',
                            status.className,
                          )}
                        >
                          <Circle className="h-2 w-2 fill-current" aria-hidden />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-3.5 py-3.5 text-[13px] whitespace-nowrap">
                        {r.matches ? (
                          <span className="flex items-center gap-1.5 font-semibold text-brand">
                            <Zap className="h-3.5 w-3.5" aria-hidden />
                            {r.matches}
                          </span>
                        ) : r.status === 'pending' ? (
                          <span className="flex items-center gap-1.5 text-gray-400">
                            <Clock className="h-3.5 w-3.5" aria-hidden />
                            En cours
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3.5 py-3.5 text-[13px] whitespace-nowrap text-gray-500">
                        {r.date}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 px-4 py-[72px] lg:px-7">
        <div className="mx-auto max-w-[1280px]">
          <div className="mx-auto mb-10 text-center">
            <p className="mb-2.5 text-xs font-bold tracking-[0.16em] text-brand uppercase">
              Questions fréquentes
            </p>
            <h2 className="font-sora text-[28px] font-extrabold tracking-[-0.04em] lg:text-[40px]">
              Tout ce que vous devez <span className="text-brand italic">savoir</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {FAQ.map((item) => (
              <div key={item.q} className="rounded-2xl border border-black/[0.06] bg-white p-6">
                <div className="mb-2.5 flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-brand/10">
                    <item.icon className="h-3.5 w-3.5 text-brand" aria-hidden />
                  </div>
                  <p className="text-[15px] font-bold">{item.q}</p>
                </div>
                <p className="pl-10 text-sm leading-relaxed text-gray-500">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pt-5 pb-[76px] lg:px-7">
        <div className="mx-auto max-w-[1280px]">
          <div
            className="relative overflow-hidden rounded-[24px] px-7 py-[48px] text-white lg:px-16 lg:py-[60px]"
            style={{ background: 'linear-gradient(135deg, #376BFF 0%, #3B82F6 100%)' }}
          >
            <div className="pointer-events-none absolute -top-10 -right-10 h-[260px] w-[260px] rounded-full bg-white/[0.06]" />
            <div className="relative z-[1] max-w-[660px]">
              <p className="mb-3.5 text-xs tracking-[0.18em] text-white/74 uppercase">
                Prêt à trouver votre bien ?
              </p>
              <p className="font-sora mb-4 text-[30px] leading-tight font-extrabold tracking-[-0.04em] lg:text-[48px]">
                Déposez votre demande dès maintenant
              </p>
              <p className="mb-6 max-w-[520px] text-[16px] text-white/88">
                Décrivez le bien de vos rêves en 3 minutes et laissez les meilleurs agents
                d&apos;Afrique de l&apos;Ouest travailler pour vous.
              </p>
              <div className="flex flex-wrap items-center gap-3.5">
                <Link
                  href="/demande-immobiliere/nouvelle"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-brand"
                >
                  <PlusCircle className="h-[17px] w-[17px]" aria-hidden />
                  Déposer une demande
                </Link>
                <Link
                  href="/annonces"
                  className="rounded-full border-[1.5px] border-white/36 px-5 py-3.5 text-sm font-semibold text-white"
                >
                  Voir les annonces
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
