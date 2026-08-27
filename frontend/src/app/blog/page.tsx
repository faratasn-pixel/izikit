'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  Home,
  Mail,
  Search,
  Send,
  Star,
  Tag,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PublicNavbar } from '@/components/public/PublicNavbar';
import { PublicFooter } from '@/components/public/PublicFooter';

type CategoryKey = 'marche' | 'conseils' | 'juridique' | 'investissement' | 'agents';

const CATEGORIES: { key: CategoryKey | 'tous'; label: string; count: number }[] = [
  { key: 'tous', label: 'Tous les articles', count: 48 },
  { key: 'marche', label: 'Marché', count: 14 },
  { key: 'conseils', label: 'Conseils acheteurs', count: 11 },
  { key: 'juridique', label: 'Juridique & Foncier', count: 9 },
  { key: 'investissement', label: 'Investissement', count: 8 },
  { key: 'agents', label: 'Agents & Pros', count: 6 },
];

const CATEGORY_STYLES: Record<CategoryKey, string> = {
  marche: 'bg-brand/10 text-brand',
  conseils: 'bg-green-600/10 text-green-600',
  juridique: 'bg-amber-500/10 text-amber-600',
  investissement: 'bg-violet-500/10 text-violet-600',
  agents: 'bg-red-500/10 text-red-600',
};

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  marche: 'Marché',
  conseils: 'Conseils acheteurs',
  juridique: 'Juridique & Foncier',
  investissement: 'Investissement',
  agents: 'Agents & Pros',
};

const FEATURED = {
  category: 'marche' as CategoryKey,
  categoryLabel: 'Marché immobilier',
  date: '15 jan. 2025',
  readTime: '8 min',
  title: "Immobilier en Côte d'Ivoire : pourquoi les prix flambent à Cocody en 2025",
  excerpt:
    'Le quartier de Cocody Riviera enregistre une hausse de 18% des prix en 12 mois. Analyse des causes, zones de tension et perspectives pour les acheteurs et investisseurs.',
  author: {
    name: 'Jean-Marc Kouassi',
    role: 'Expert immobilier',
    avatar: 'https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F35-50%2FAfrican%2F1',
  },
};

const GRID_ARTICLES = [
  {
    id: 'erreurs-achat-dakar',
    category: 'conseils' as CategoryKey,
    img: 'https://storage.googleapis.com/banani-generated-images/generated-images/f25cf62a-7a39-470f-8479-0cbe12a5e61c.jpg',
    title: "5 erreurs à éviter lors d'un achat immobilier à Dakar",
    excerpt:
      'Procédures notariales, titres fonciers, arrhes et clauses suspensives : le guide complet.',
    author: {
      name: 'Fatou S.',
      avatar: 'https://storage.googleapis.com/banani-avatars/avatar%2Ffemale%2F25-35%2FAfrican%2F4',
    },
    date: '10 jan.',
    readTime: '5 min',
  },
  {
    id: 'titre-foncier-benin',
    category: 'juridique' as CategoryKey,
    img: 'https://storage.googleapis.com/banani-generated-images/generated-images/9660d3cc-2586-43f6-8fbe-315f17c908e2.jpg',
    title: 'Titre foncier au Bénin : comment sécuriser votre terrain',
    excerpt:
      "Démarches, délais, coûts et risques : tout ce qu'il faut savoir avant d'acheter un terrain à Cotonou.",
    author: {
      name: 'Rodrigue H.',
      avatar: 'https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F35-50%2FAfrican%2F6',
    },
    date: '8 jan.',
    readTime: '7 min',
  },
  {
    id: 'rendement-locatif-2025',
    category: 'investissement' as CategoryKey,
    img: 'https://storage.googleapis.com/banani-generated-images/generated-images/e941530e-cd5f-4dbd-ba74-7cf1088bf4e3.jpg',
    title: 'Rendement locatif : quelle ville rapporte le plus en 2025 ?',
    excerpt:
      'Comparatif Abidjan, Lomé, Cotonou, Dakar : rendements nets, fiscalité et risques locatifs.',
    author: {
      name: 'Adja K.',
      avatar: 'https://storage.googleapis.com/banani-avatars/avatar%2Ffemale%2F35-50%2FAfrican%2F2',
    },
    date: '5 jan.',
    readTime: '6 min',
  },
];

const LIST_ARTICLES = [
  {
    id: 'quartiers-lome-expat',
    category: 'marche' as CategoryKey,
    img: 'https://storage.googleapis.com/banani-generated-images/generated-images/451487ae-1126-4aa7-b8f9-a0d78f76bb4d.jpg',
    title: 'Lomé : les quartiers résidentiels les plus demandés par les expatriés',
    excerpt:
      'Baguida, Agoè, Tokoin… notre analyse des zones en plein essor et des prix pratiqués pour les familles expatriées en 2025.',
    author: {
      name: 'Kokou A.',
      avatar: 'https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F25-35%2FAfrican%2F3',
    },
    date: '3 jan. 2025',
    readTime: '4 min',
  },
  {
    id: 'agent-certifie-pourquoi',
    category: 'agents' as CategoryKey,
    img: 'https://storage.googleapis.com/banani-generated-images/generated-images/5bf1f08b-7422-47f3-a12c-7d94a21b0c1f.jpg',
    title: 'Pourquoi faire appel à un agent certifié Habitat-Afrik ?',
    excerpt:
      'Formation, KYC, garanties et engagement de service : ce qui distingue nos agents certifiés des intermédiaires non vérifiés.',
    author: {
      name: 'Mariam D.',
      avatar: 'https://storage.googleapis.com/banani-avatars/avatar%2Ffemale%2F25-35%2FAfrican%2F5',
    },
    date: '28 déc. 2024',
    readTime: '3 min',
  },
  {
    id: 'location-saisonniere',
    category: 'investissement' as CategoryKey,
    img: 'https://storage.googleapis.com/banani-generated-images/generated-images/29bc630d-f99d-4f5a-a24f-d0c84a6c1b47.jpg',
    title: "Location saisonnière en Afrique de l'Ouest : opportunité ou risque ?",
    excerpt:
      "Diaspora, tourisme d'affaires et festivals : analyse des revenus potentiels et des précautions juridiques à prendre.",
    author: {
      name: 'Serge N.',
      avatar: 'https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F35-50%2FAfrican%2F4',
    },
    date: '22 déc. 2024',
    readTime: '5 min',
  },
  {
    id: 'bail-residentiel-benin',
    category: 'juridique' as CategoryKey,
    img: 'https://storage.googleapis.com/banani-generated-images/generated-images/861fa519-ec20-46cd-9a3b-ae70c2dcc1bc.jpg',
    title: 'Bail résidentiel au Bénin : droits et obligations du locataire et du bailleur',
    excerpt:
      'Dépôt de garantie, préavis, révision des loyers : le cadre légal béninois expliqué simplement avec exemples pratiques.',
    author: {
      name: 'Cécile A.',
      avatar: 'https://storage.googleapis.com/banani-avatars/avatar%2Ffemale%2F35-50%2FAfrican%2F7',
    },
    date: '18 déc. 2024',
    readTime: '6 min',
  },
];

const POPULAR = [
  { title: 'Pourquoi les prix flambent à Cocody en 2025', meta: '12 400 lectures · 8 min' },
  { title: 'Rendement locatif : quelle ville rapporte le plus ?', meta: '9 800 lectures · 6 min' },
  { title: "5 erreurs à éviter lors d'un achat à Dakar", meta: '7 200 lectures · 5 min' },
  {
    title: 'Titre foncier au Bénin : comment sécuriser votre terrain',
    meta: '5 600 lectures · 7 min',
  },
  { title: 'Location saisonnière : opportunité ou risque ?', meta: '4 300 lectures · 5 min' },
];

const TAGS = [
  'Marché',
  'Cocody',
  'Titre foncier',
  'Investissement',
  'Dakar',
  'Abidjan',
  'Bail',
  'Rendement',
  'Villa',
  'Cotonou',
  'Lomé',
  'Expatriés',
];

function InertRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div title="Bientôt disponible" className={cn('cursor-not-allowed select-none', className)}>
      {children}
    </div>
  );
}

export default function BlogPage() {
  const [category, setCategory] = useState<CategoryKey | 'tous'>('tous');

  const grid = useMemo(
    () => GRID_ARTICLES.filter((a) => category === 'tous' || a.category === category),
    [category],
  );
  const list = useMemo(
    () => LIST_ARTICLES.filter((a) => category === 'tous' || a.category === category),
    [category],
  );

  return (
    <div className="bg-white text-neutral-900">
      <PublicNavbar active="blog" />

      {/* HERO */}
      <section
        className="relative overflow-hidden px-4 py-14 text-center lg:px-7 lg:py-16"
        style={{ background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 50%, #0F172A 100%)' }}
      >
        <div className="pointer-events-none absolute -top-[180px] -right-20 h-[500px] w-[500px] rounded-full bg-white/5" />
        <div className="relative z-[1] mx-auto max-w-[1280px]">
          <div className="mb-4.5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold tracking-[0.12em] whitespace-nowrap text-white/90 uppercase">
            <BookOpen className="h-3 w-3" aria-hidden />
            Blog &amp; Actualités
          </div>
          <h1 className="font-sora mx-auto mb-3.5 max-w-[720px] text-[28px] leading-[1.1] font-extrabold tracking-[-0.04em] text-white lg:text-[44px]">
            L&apos;immobilier en Afrique de l&apos;Ouest, décrypté pour vous
          </h1>
          <p className="mx-auto mb-7 max-w-[560px] text-[15px] leading-relaxed text-white/75 lg:text-base">
            Conseils d&apos;experts, analyses de marché, actualités juridiques et tendances
            immobilières au Bénin, Togo, Côte d&apos;Ivoire et Sénégal.
          </p>
          <InertRow className="mx-auto flex max-w-[520px] items-center gap-0 rounded-full bg-white shadow-[0_4px_24px_rgba(0,0,0,0.18)]">
            <div className="flex flex-shrink-0 items-center pl-4.5">
              <Search className="h-4 w-4 text-gray-400" aria-hidden />
            </div>
            <span className="flex-1 truncate px-4 py-3.5 text-left text-sm text-gray-400">
              Rechercher un article, un sujet…
            </span>
            <span className="m-1 flex items-center gap-2 rounded-full bg-brand px-[22px] py-3 text-sm font-semibold whitespace-nowrap text-white">
              <Search className="h-3.5 w-3.5" aria-hidden />
              Rechercher
            </span>
          </InertRow>
        </div>
      </section>

      {/* CATEGORIES */}
      <div className="border-b border-black/[0.06] px-4 lg:px-7">
        <div className="mx-auto max-w-[1280px] overflow-x-auto">
          <div className="flex items-center gap-1">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className={cn(
                  'flex items-center gap-1.5 border-b-2 px-4.5 py-4 text-[13px] font-semibold whitespace-nowrap',
                  category === c.key
                    ? 'border-brand text-brand'
                    : 'border-transparent text-gray-500 hover:text-neutral-900',
                )}
              >
                {c.label}
                <span
                  className={cn(
                    'flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold',
                    category === c.key ? 'bg-brand/15 text-brand' : 'bg-gray-100 text-gray-500',
                  )}
                >
                  {c.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN */}
      <section className="px-4 py-11 pb-20 lg:px-7">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-10 lg:grid-cols-[1fr_320px] lg:items-start">
          {/* LEFT */}
          <div className="order-2 flex flex-col gap-8 lg:order-1">
            {/* FEATURED */}
            <div>
              <div className="mb-5 flex items-center gap-2 text-[17px] font-bold">
                <Star className="h-4 w-4 fill-amber-500 text-amber-500" aria-hidden />
                Article à la une
              </div>
              <InertRow className="grid grid-cols-1 overflow-hidden rounded-2xl border border-black/[0.08] lg:grid-cols-2">
                <div className="flex h-[220px] flex-col items-center justify-center gap-2 bg-gradient-to-br from-sky-100 to-blue-50 lg:h-full">
                  <TrendingUp className="h-8 w-8 text-brand" aria-hidden />
                  <span className="text-xs text-gray-400">Image non fournie par le design</span>
                </div>
                <div className="flex flex-col justify-center gap-3.5 p-7">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold whitespace-nowrap uppercase',
                        CATEGORY_STYLES[FEATURED.category],
                      )}
                    >
                      <TrendingUp className="h-[11px] w-[11px]" aria-hidden />
                      {FEATURED.categoryLabel}
                    </span>
                    <span className="text-[11px] whitespace-nowrap text-gray-500">
                      {FEATURED.date} · {FEATURED.readTime}
                    </span>
                  </div>
                  <p className="text-[22px] leading-tight font-extrabold tracking-[-0.02em]">
                    {FEATURED.title}
                  </p>
                  <p className="text-sm leading-relaxed text-gray-500">{FEATURED.excerpt}</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <img
                      src={FEATURED.author.avatar}
                      alt={FEATURED.author.name}
                      className="h-7 w-7 rounded-full object-cover"
                    />
                    <span className="text-[13px] font-semibold whitespace-nowrap">
                      {FEATURED.author.name}
                    </span>
                    <span className="text-xs whitespace-nowrap text-gray-500">
                      {FEATURED.author.role}
                    </span>
                  </div>
                  <span className="mt-1 inline-flex w-fit items-center gap-2 rounded-full bg-brand px-4.5 py-2.5 text-[13px] font-bold whitespace-nowrap text-white">
                    Lire l&apos;article
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </div>
              </InertRow>
            </div>

            {/* GRID */}
            <div>
              <div className="mb-5 flex items-center justify-between gap-4">
                <span className="text-[17px] font-bold">Derniers articles</span>
                <InertRow className="text-[13px] font-semibold whitespace-nowrap text-brand">
                  Voir tous les articles →
                </InertRow>
              </div>
              {grid.length === 0 ? (
                <div className="rounded-2xl border border-black/[0.06] bg-gray-50 p-8 text-center text-sm text-gray-500">
                  Aucun article dans cette catégorie.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {grid.map((a) => (
                    <InertRow
                      key={a.id}
                      className="flex flex-col overflow-hidden rounded-xl border border-black/[0.08]"
                    >
                      <img src={a.img} alt={a.title} className="h-40 w-full object-cover" />
                      <div className="flex flex-1 flex-col gap-2 p-4">
                        <span
                          className={cn(
                            'inline-flex w-fit items-center rounded-full px-2.5 py-[3px] text-[11px] font-bold whitespace-nowrap uppercase',
                            CATEGORY_STYLES[a.category],
                          )}
                        >
                          {CATEGORY_LABELS[a.category]}
                        </span>
                        <p className="text-sm leading-snug font-bold">{a.title}</p>
                        <p className="flex-1 text-[13px] leading-relaxed text-gray-500">
                          {a.excerpt}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <img
                              src={a.author.avatar}
                              alt={a.author.name}
                              className="h-[22px] w-[22px] rounded-full object-cover"
                            />
                            <span className="text-xs font-semibold whitespace-nowrap">
                              {a.author.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] whitespace-nowrap text-gray-500">
                              {a.date}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] whitespace-nowrap text-gray-500">
                              <Clock className="h-[11px] w-[11px]" aria-hidden />
                              {a.readTime}
                            </span>
                          </div>
                        </div>
                      </div>
                    </InertRow>
                  ))}
                </div>
              )}
            </div>

            {/* LIST */}
            <div>
              <div className="mb-5 text-[17px] font-bold">Plus d&apos;articles</div>
              {list.length === 0 ? (
                <div className="rounded-2xl border border-black/[0.06] bg-gray-50 p-8 text-center text-sm text-gray-500">
                  Aucun article dans cette catégorie.
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {list.map((a) => (
                    <InertRow
                      key={a.id}
                      className="flex gap-4 rounded-xl border border-black/[0.08] p-4"
                    >
                      <img
                        src={a.img}
                        alt={a.title}
                        className="h-[76px] w-[100px] flex-shrink-0 rounded-lg object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <span
                          className={cn(
                            'mb-1.5 inline-flex w-fit items-center rounded-full px-2.5 py-[3px] text-[11px] font-bold whitespace-nowrap uppercase',
                            CATEGORY_STYLES[a.category],
                          )}
                        >
                          {CATEGORY_LABELS[a.category]}
                        </span>
                        <p className="mb-1 text-sm leading-snug font-bold">{a.title}</p>
                        <p className="mb-2 line-clamp-2 text-[13px] leading-relaxed text-gray-500">
                          {a.excerpt}
                        </p>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <div className="flex items-center gap-1.5">
                            <img
                              src={a.author.avatar}
                              alt={a.author.name}
                              className="h-[22px] w-[22px] rounded-full object-cover"
                            />
                            <span className="text-xs font-semibold whitespace-nowrap">
                              {a.author.name}
                            </span>
                          </div>
                          <span className="text-[11px] whitespace-nowrap text-gray-500">
                            {a.date}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] whitespace-nowrap text-gray-500">
                            <Clock className="h-[11px] w-[11px]" aria-hidden />
                            {a.readTime}
                          </span>
                        </div>
                      </div>
                    </InertRow>
                  ))}
                </div>
              )}
            </div>

            {/* PAGINATION */}
            <div className="flex items-center gap-1.5">
              <InertRow className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/[0.08] text-gray-500">
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </InertRow>
              <InertRow className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-sm font-semibold text-white">
                1
              </InertRow>
              {[2, 3].map((n) => (
                <InertRow
                  key={n}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/[0.08] text-sm font-semibold text-gray-500"
                >
                  {n}
                </InertRow>
              ))}
              <span className="px-1 text-[13px] text-gray-500">…</span>
              <InertRow className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/[0.08] text-sm font-semibold text-gray-500">
                6
              </InertRow>
              <InertRow className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/[0.08] text-gray-500">
                <ChevronRight className="h-4 w-4" aria-hidden />
              </InertRow>
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="order-1 flex flex-col gap-6 lg:order-2">
            {/* NEWSLETTER */}
            <div className="rounded-2xl border border-black/[0.08] p-5">
              <div className="mb-4 flex items-center gap-1.5 text-[13px] font-bold tracking-[0.1em] uppercase">
                <Mail className="h-3.5 w-3.5 text-brand" aria-hidden />
                Newsletter
              </div>
              <p className="mb-3.5 text-[13px] leading-relaxed text-gray-500">
                Recevez chaque semaine les meilleures analyses immobilières directement dans votre
                boîte mail.
              </p>
              <InertRow className="mb-2.5 rounded-lg border border-black/[0.08] bg-gray-50 px-3.5 py-2.5 text-[13px] text-gray-400">
                Votre adresse email
              </InertRow>
              <InertRow className="flex items-center justify-center gap-2 rounded-full bg-brand px-4 py-2.5 text-[13px] font-bold whitespace-nowrap text-white">
                <Send className="h-3.5 w-3.5" aria-hidden />
                S&apos;abonner gratuitement
              </InertRow>
            </div>

            {/* POPULAR */}
            <div className="rounded-2xl border border-black/[0.08] p-5">
              <div className="mb-4 flex items-center gap-1.5 text-[13px] font-bold tracking-[0.1em] uppercase">
                <Flame className="h-3.5 w-3.5 text-red-500" aria-hidden />
                Articles populaires
              </div>
              <div className="flex flex-col gap-3.5">
                {POPULAR.map((p, i) => (
                  <InertRow key={p.title} className="flex items-start gap-3">
                    <span className="w-5 flex-shrink-0 text-xl leading-none font-black text-brand/30">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <p className="mb-0.5 text-[13px] leading-snug font-semibold">{p.title}</p>
                      <p className="text-[11px] text-gray-500">{p.meta}</p>
                    </div>
                  </InertRow>
                ))}
              </div>
            </div>

            {/* TAGS */}
            <div className="rounded-2xl border border-black/[0.08] p-5">
              <div className="mb-4 flex items-center gap-1.5 text-[13px] font-bold tracking-[0.1em] uppercase">
                <Tag className="h-3.5 w-3.5 text-gray-500" aria-hidden />
                Sujets populaires
              </div>
              <div className="flex flex-wrap gap-2">
                {TAGS.map((t, i) => (
                  <InertRow
                    key={t}
                    className={cn(
                      'rounded-full border px-3 py-[5px] text-xs font-medium whitespace-nowrap',
                      i === 0
                        ? 'border-brand/30 bg-brand/10 text-brand'
                        : 'border-black/[0.08] bg-gray-50 text-gray-500',
                    )}
                  >
                    {t}
                  </InertRow>
                ))}
              </div>
            </div>

            {/* PROMO */}
            <div
              className="rounded-2xl p-6 text-center"
              style={{ background: 'linear-gradient(135deg, #0EA5E9, #0284C7)' }}
            >
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
                <Home className="h-[22px] w-[22px] text-white" aria-hidden />
              </div>
              <p className="mb-2 text-[15px] font-extrabold whitespace-nowrap text-white">
                Trouvez votre bien idéal
              </p>
              <p className="mb-4 text-xs leading-relaxed text-white/80">
                Des milliers d&apos;annonces vérifiées au Bénin, Togo, Côte d&apos;Ivoire et
                Sénégal. Des agents certifiés à votre service.
              </p>
              <Link
                href="/annonces"
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[13px] font-bold whitespace-nowrap text-brand"
              >
                Voir les annonces
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
