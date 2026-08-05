'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Bath,
  BedDouble,
  Calendar,
  Car,
  ChevronDown,
  Cpu,
  Droplets,
  Eye,
  FileCheck,
  FileText,
  Flag,
  Grid2x2,
  Heart,
  Image as ImageIcon,
  Info,
  LayoutList,
  Layers,
  Map,
  MapPin,
  MessageSquare,
  Mountain,
  Move,
  Phone,
  RefreshCw,
  Send,
  Share2,
  Sparkles,
  Star,
  Sun,
  TreePine,
  Utensils,
  Video,
  Waves,
  Wifi,
  Wind,
  ShieldCheck,
  User,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PublicNavbar } from '@/components/public/PublicNavbar';
import { PublicFooter } from '@/components/public/PublicFooter';

const FEATURES = [
  { icon: BedDouble, val: '5', label: 'Chambres' },
  { icon: Bath, val: '4', label: 'Salles de bain' },
  { icon: Move, val: '320 m²', label: 'Surface habitable' },
  { icon: TreePine, val: '600 m²', label: 'Terrain' },
  { icon: Layers, val: '2', label: 'Niveaux' },
  { icon: Car, val: '2', label: 'Garages' },
  { icon: Calendar, val: '2022', label: 'Année' },
  { icon: FileCheck, val: 'ACD', label: 'Titre foncier' },
];

const AMENITIES = [
  { icon: Waves, label: 'Piscine' },
  { icon: Wind, label: 'Climatisation' },
  { icon: Zap, label: 'Groupe électrogène' },
  { icon: Utensils, label: 'Cuisine équipée' },
  { icon: ShieldCheck, label: 'Sécurité 24h/24' },
  { icon: Cpu, label: 'Domotique' },
  { icon: Mountain, label: 'Terrasse panoramique' },
  { icon: TreePine, label: 'Jardin paysagé' },
  { icon: Wifi, label: 'Fibre optique' },
  { icon: User, label: 'Dépendance gardien' },
  { icon: Droplets, label: "Citerne d'eau" },
  { icon: Sun, label: 'Panneaux solaires' },
];

const SIMILAR = [
  {
    id: 'sim-angre',
    title: 'Villa R+1 piscine, Angré',
    location: 'Abidjan, Angré · 🇨🇮',
    price: '142 000 000',
    badge: 'À vendre',
    badgeColor: 'bg-emerald-500',
    img: 'https://storage.googleapis.com/banani-generated-images/generated-images/a077caf6-2f83-4010-a1bc-4e13c1a4b3ce.jpg',
  },
  {
    id: 'sim-marcory',
    title: 'Villa basse 4 ch. Marcory',
    location: 'Abidjan, Marcory · 🇨🇮',
    price: '98 500 000',
    badge: 'À vendre',
    badgeColor: 'bg-emerald-500',
    img: 'https://storage.googleapis.com/banani-generated-images/generated-images/0051f715-3df4-42a9-8236-d96f6ae6056f.jpg',
  },
  {
    id: 'sim-bingerville',
    title: 'Villa prestige, Bingerville',
    location: 'Bingerville · 🇨🇮',
    price: '220 000 000',
    badge: 'Exclusif',
    badgeColor: 'bg-amber-500',
    img: 'https://storage.googleapis.com/banani-generated-images/generated-images/a621bef5-1f0e-41ff-9ba0-c47c5f2273b5.jpg',
  },
];

const META = [
  { label: 'Référence', value: 'HA-CI-00247' },
  { label: 'Publié le', value: '5 jan. 2025' },
  { label: 'Type de bien', value: 'Villa duplex' },
  { label: 'Transaction', value: 'Vente' },
  { label: 'Titre foncier', value: 'ACD (Vérifié)', green: true },
  { label: 'Disponibilité', value: 'Immédiate', green: true },
];

function InertRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div title="Bientôt disponible" className={cn('cursor-not-allowed select-none', className)}>
      {children}
    </div>
  );
}

export default function AnnonceDetailPage() {
  const [saved, setSaved] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('Bonjour, je suis intéressé par cette annonce...');

  return (
    <div className="bg-[#F5F6F8] text-[#1A1A1A]">
      <PublicNavbar active="annonces" />

      {/* BREADCRUMB */}
      <div className="border-b border-black/[0.06] bg-white py-3.5">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-2 px-4 text-[13px] text-gray-500 lg:px-7">
          <Link href="/" className="text-gray-500">
            Accueil
          </Link>
          <span className="text-gray-300">/</span>
          <Link href="/annonces" className="text-gray-500">
            Annonces
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-500">Villas à Abidjan</span>
          <span className="text-gray-300">/</span>
          <span className="font-medium text-neutral-900">Villa duplex standing haut de gamme</span>
        </div>
      </div>

      {/* HERO GALLERY */}
      <div className="bg-[#0F172A]">
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-[3px] lg:h-[420px] lg:grid-cols-[1.45fr_1fr]">
          <div className="relative h-[260px] overflow-hidden lg:h-full">
            <img
              src="https://storage.googleapis.com/banani-generated-images/generated-images/09f3ab6a-eb33-415b-8e93-bd1b272af77f.jpg"
              alt="Villa duplex standing haut de gamme"
              className="h-full w-full object-cover"
            />
            <div className="absolute top-4 left-4 z-[2] flex gap-2">
              <span className="rounded-full bg-emerald-500 px-3.5 py-[5px] text-xs font-bold whitespace-nowrap text-white">
                À vendre
              </span>
              <span className="rounded-full bg-black/75 px-3.5 py-[5px] text-xs font-bold whitespace-nowrap text-white">
                Villa
              </span>
            </div>
            <div className="absolute top-4 right-4 z-[2] flex gap-2">
              <button
                type="button"
                onClick={() => setSaved((s) => !s)}
                className="flex items-center gap-1.5 rounded-full bg-white/92 px-3.5 py-2 text-xs font-semibold whitespace-nowrap text-neutral-900"
              >
                <Heart
                  className={cn(
                    'h-3.5 w-3.5',
                    saved ? 'fill-red-500 text-red-500' : 'text-red-500',
                  )}
                  aria-hidden
                />
                {saved ? 'Sauvegardé' : 'Sauvegarder'}
              </button>
              <InertRow>
                <span className="flex items-center gap-1.5 rounded-full bg-white/92 px-3.5 py-2 text-xs font-semibold whitespace-nowrap text-neutral-900">
                  <Share2 className="h-3.5 w-3.5" aria-hidden />
                  Partager
                </span>
              </InertRow>
            </div>
            <InertRow className="absolute right-3.5 bottom-3.5 z-[2]">
              <span className="flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-[5px] text-xs font-semibold whitespace-nowrap text-white">
                <ImageIcon className="h-[13px] w-[13px]" aria-hidden />
                Voir les 8 photos
              </span>
            </InertRow>
          </div>
          <div className="grid grid-rows-2 gap-[3px]">
            <div className="h-[130px] overflow-hidden lg:h-full">
              <img
                src="https://storage.googleapis.com/banani-generated-images/generated-images/4da13982-1dfb-439c-be0f-c25ffc3e2ff7.jpg"
                alt="Salon villa"
                className="h-full w-full object-cover"
              />
            </div>
            <InertRow className="relative h-[130px] overflow-hidden lg:h-full">
              <img
                src="https://storage.googleapis.com/banani-generated-images/generated-images/efc67668-742c-485a-8459-781672017249.jpg"
                alt="Piscine villa"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/42 text-[15px] font-bold text-white">
                <Grid2x2 className="h-5 w-5" aria-hidden />
                +6 photos
              </div>
            </InertRow>
          </div>
        </div>
      </div>

      {/* DETAIL CONTENT */}
      <div className="mx-auto max-w-[1280px] px-4 py-9 pb-[72px] lg:px-7">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
          {/* MAIN */}
          <div className="min-w-0">
            {/* TITLE BLOCK */}
            <div className="mb-4 rounded-2xl bg-white p-7">
              <div className="mb-4 flex flex-col-reverse items-start justify-between gap-5 sm:flex-row">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-bold whitespace-nowrap text-brand">
                    Villa · Vente
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold whitespace-nowrap text-emerald-600">
                    <BadgeCheck className="h-[11px] w-[11px]" aria-hidden />
                    Annonce vérifiée
                  </span>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold whitespace-nowrap text-gray-500">
                    Réf. HA-CI-00247
                  </span>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-[26px] font-extrabold whitespace-nowrap text-brand lg:text-[30px]">
                    185 000 000 <span className="text-base font-bold text-gray-500">FCFA</span>
                  </div>
                  <div className="text-xs text-gray-500">≈ 282 000 €</div>
                </div>
              </div>
              <h1 className="font-sora mb-3 text-2xl font-extrabold tracking-[-0.03em] lg:text-[26px]">
                Villa duplex standing haut de gamme
              </h1>
              <div className="mb-4.5 flex items-center gap-1.5 text-sm text-gray-500">
                <MapPin className="h-[15px] w-[15px] flex-shrink-0 text-brand" aria-hidden />
                Abidjan, Cocody Riviera 3 · 🇨🇮 Côte d&apos;Ivoire
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-black/[0.06] pt-3.5">
                {[
                  { icon: Eye, text: '1 248 vues' },
                  { icon: Calendar, text: 'Publié le 5 jan. 2025' },
                  { icon: Heart, text: '87 favoris' },
                  { icon: RefreshCw, text: 'Mis à jour il y a 3 jours' },
                ].map((s) => (
                  <span
                    key={s.text}
                    className="flex items-center gap-1.5 text-[13px] whitespace-nowrap text-gray-500"
                  >
                    <s.icon className="h-[13px] w-[13px]" aria-hidden />
                    {s.text}
                  </span>
                ))}
              </div>
            </div>

            {/* CARACTERISTIQUES */}
            <div className="mb-4 rounded-2xl bg-white p-7">
              <div className="mb-5 flex items-center gap-2 text-[17px] font-bold">
                <LayoutList className="h-[17px] w-[17px] text-brand" aria-hidden />
                Caractéristiques
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {FEATURES.map((f) => (
                  <div
                    key={f.label}
                    className="flex flex-col items-center gap-1.5 rounded-[14px] bg-gray-50 px-2.5 py-4 text-center"
                  >
                    <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-brand/10">
                      <f.icon className="h-[18px] w-[18px] text-brand" aria-hidden />
                    </div>
                    <div className="text-base font-bold">{f.val}</div>
                    <div className="text-[11px] leading-tight text-gray-500">{f.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* EQUIPEMENTS */}
            <div className="mb-4 rounded-2xl bg-white p-7">
              <div className="mb-5 flex items-center gap-2 text-[17px] font-bold">
                <Sparkles className="h-[17px] w-[17px] text-brand" aria-hidden />
                Équipements &amp; prestations
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {AMENITIES.map((a) => (
                  <div
                    key={a.label}
                    className="flex items-center gap-2.5 rounded-[10px] bg-gray-50 px-3.5 py-2.5 text-[13px]"
                  >
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-brand/10">
                      <a.icon className="h-3.5 w-3.5 text-brand" aria-hidden />
                    </div>
                    {a.label}
                  </div>
                ))}
              </div>
            </div>

            {/* DESCRIPTION */}
            <div className="mb-4 rounded-2xl bg-white p-7">
              <div className="mb-5 flex items-center gap-2 text-[17px] font-bold">
                <FileText className="h-[17px] w-[17px] text-brand" aria-hidden />
                Description
              </div>
              <p className="text-sm leading-[1.75]">
                Magnifique villa duplex de standing haut de gamme située en plein cœur de la Riviera
                3, quartier prisé de Cocody. Construite en 2022 sur un terrain de 600 m², cette
                propriété d&apos;exception offre 320 m² de surface habitable sur deux niveaux, avec
                des finitions luxueuses et des matériaux de première qualité importés d&apos;Europe.
              </p>
              {descExpanded && (
                <p className="mt-4 text-sm leading-[1.75]">
                  Le rez-de-chaussée comprend un vaste salon-séjour avec double hauteur sous
                  plafond, une salle à manger formelle, une cuisine américaine entièrement équipée,
                  une chambre invités avec salle de bain privative, et un bureau. L&apos;étage
                  abrite la suite parentale avec dressing et terrasse privée, ainsi que trois
                  chambres enfants dotées chacune de leur salle de bain.
                </p>
              )}
              <button
                type="button"
                onClick={() => setDescExpanded((v) => !v)}
                className="mt-2.5 inline-flex items-center gap-1 text-[13px] font-semibold text-brand"
              >
                {descExpanded ? 'Voir moins' : 'Lire la suite'}
                <ChevronDown
                  className={cn('h-3.5 w-3.5 transition-transform', descExpanded && 'rotate-180')}
                  aria-hidden
                />
              </button>
            </div>

            {/* LOCALISATION */}
            <div className="mb-4 rounded-2xl bg-white p-7">
              <div className="mb-5 flex items-center gap-2 text-[17px] font-bold">
                <Map className="h-[17px] w-[17px] text-brand" aria-hidden />
                Localisation
              </div>
              <div className="overflow-hidden rounded-[14px]">
                <img
                  src="https://storage.googleapis.com/banani-generated-images/generated-images/01bc6536-0941-4c52-9346-35e407f1b4d4.jpg"
                  alt="Carte de la localisation"
                  className="w-full"
                />
              </div>
              <div className="mt-3 flex items-start gap-1.5 text-[13px] text-gray-500">
                <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-brand" aria-hidden />
                Cocody Riviera 3, Abidjan, Côte d&apos;Ivoire — Adresse exacte communiquée après
                contact avec l&apos;agent
              </div>
            </div>

            {/* ANNONCES SIMILAIRES */}
            <div className="rounded-2xl bg-white p-7">
              <div className="mb-5 flex items-center gap-2 text-[17px] font-bold">
                <Grid2x2 className="h-[17px] w-[17px] text-brand" aria-hidden />
                Annonces similaires
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {SIMILAR.map((s) => (
                  <Link
                    key={s.id}
                    href={`/annonces/${s.id}`}
                    className="overflow-hidden rounded-[14px] border border-black/[0.06]"
                  >
                    <div className="relative h-[148px]">
                      <img src={s.img} alt={s.title} className="h-full w-full object-cover" />
                      <span
                        className={cn(
                          'absolute top-2.5 left-2.5 rounded-full px-2.5 py-[3px] text-[11px] font-bold whitespace-nowrap text-white',
                          s.badgeColor,
                        )}
                      >
                        {s.badge}
                      </span>
                    </div>
                    <div className="p-3.5">
                      <p className="mb-1 truncate text-[13px] font-bold">{s.title}</p>
                      <p className="mb-2 flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="h-[11px] w-[11px]" aria-hidden />
                        {s.location}
                      </p>
                      <p className="text-[15px] font-extrabold text-brand">
                        {s.price}{' '}
                        <span className="text-[11px] font-normal text-gray-500">FCFA</span>
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* SIDEBAR */}
          <aside className="flex flex-col gap-3.5 lg:sticky lg:top-5">
            {/* PRICE + AGENT + CTA */}
            <div className="rounded-2xl bg-white p-[22px]">
              <div className="mb-0.5 text-[26px] font-extrabold whitespace-nowrap text-brand">
                185 000 000 <span className="text-[13px] font-bold text-gray-500">FCFA</span>
              </div>
              <div className="mb-[18px] text-xs text-gray-500">≈ 282 000 €</div>

              <div className="mb-[18px] flex items-center gap-3 rounded-xl bg-gray-50 p-3.5">
                <img
                  src="https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F35-50%2FAfrican%2F2"
                  alt="Kofi Atta"
                  className="h-11 w-11 flex-shrink-0 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">Kofi Atta</p>
                  <p className="text-xs text-gray-500">Agent · Cabinet KA Immo</p>
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-[3px] text-[11px] font-semibold whitespace-nowrap text-emerald-600">
                    <BadgeCheck className="h-[11px] w-[11px]" aria-hidden />
                    Vérifié
                  </span>
                </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-1">
                  <span className="text-[11px] whitespace-nowrap text-gray-500">8 annonces</span>
                  <span className="flex items-center gap-0.5">
                    {[0, 1, 2, 3].map((i) => (
                      <Star
                        key={i}
                        className="h-[11px] w-[11px] fill-amber-400 text-amber-400"
                        aria-hidden
                      />
                    ))}
                    <Star className="h-[11px] w-[11px] text-gray-200" aria-hidden />
                  </span>
                </div>
              </div>

              <InertRow className="mb-2.5">
                <span className="flex w-full items-center justify-center gap-2 rounded-full bg-brand px-3 py-3.5 text-sm font-bold whitespace-nowrap text-white">
                  <Send className="h-[15px] w-[15px]" aria-hidden />
                  Contacter l&apos;agent
                </span>
              </InertRow>
              <InertRow className="mb-2.5">
                <span className="flex w-full items-center justify-center gap-2 rounded-full border border-black/[0.08] bg-gray-50 px-3 py-3 text-sm font-semibold whitespace-nowrap">
                  <Phone className="h-[15px] w-[15px] text-emerald-500" aria-hidden />
                  Appeler l&apos;agent
                </span>
              </InertRow>
              <InertRow className="mb-3">
                <span className="flex w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-brand bg-brand/[0.06] px-3 py-3 text-sm font-bold whitespace-nowrap text-brand">
                  <Video className="h-[15px] w-[15px]" aria-hidden />
                  Demander une visite VR
                </span>
              </InertRow>
              <InertRow>
                <span className="flex items-center justify-center gap-1.5 text-xs whitespace-nowrap text-gray-500">
                  <Flag className="h-[13px] w-[13px]" aria-hidden />
                  Signaler cette annonce
                </span>
              </InertRow>
            </div>

            {/* QUICK MESSAGE FORM */}
            <div className="rounded-2xl bg-white p-[22px]">
              <div className="mb-4 flex items-center gap-2 text-[15px] font-bold">
                <MessageSquare className="h-4 w-4 text-brand" aria-hidden />
                Envoyer un message
              </div>
              <p className="mb-1.5 text-[11px] font-semibold tracking-[0.08em] text-gray-500 uppercase">
                Nom complet
              </p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Votre nom"
                className="mb-3 w-full rounded-lg border border-black/[0.08] bg-gray-50 px-3 py-2.5 text-[13px] outline-none placeholder:text-gray-400"
              />
              <p className="mb-1.5 text-[11px] font-semibold tracking-[0.08em] text-gray-500 uppercase">
                Téléphone
              </p>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+225 · Votre numéro"
                className="mb-3 w-full rounded-lg border border-black/[0.08] bg-gray-50 px-3 py-2.5 text-[13px] outline-none placeholder:text-gray-400"
              />
              <p className="mb-1.5 text-[11px] font-semibold tracking-[0.08em] text-gray-500 uppercase">
                Message
              </p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="mb-3 w-full rounded-lg border border-black/[0.08] bg-gray-50 px-3 py-2.5 text-[13px] outline-none"
              />
              <InertRow>
                <span className="flex w-full items-center justify-center gap-2 rounded-full bg-brand px-3 py-3 text-sm font-bold whitespace-nowrap text-white">
                  <Send className="h-3.5 w-3.5" aria-hidden />
                  Envoyer
                </span>
              </InertRow>
            </div>

            {/* META CARD */}
            <div className="rounded-2xl bg-white p-[22px]">
              <div className="mb-1 flex items-center gap-2 text-[15px] font-bold">
                <Info className="h-4 w-4 text-brand" aria-hidden />
                Infos pratiques
              </div>
              {META.map((m) => (
                <div
                  key={m.label}
                  className="flex items-center justify-between border-b border-black/[0.06] py-2.5 text-[13px] last:border-0"
                >
                  <span className="text-gray-500">{m.label}</span>
                  <span
                    className={cn(
                      'font-semibold',
                      m.green ? 'text-emerald-500' : 'text-neutral-900',
                    )}
                  >
                    {m.value}
                  </span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
