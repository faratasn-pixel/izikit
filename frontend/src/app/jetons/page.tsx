'use client';

import { useEffect, useState } from 'react';
import {
  Download,
  Coins,
  Zap,
  Check,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Gift,
  Filter,
} from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { cn } from '@/lib/utils';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import {
  TOKEN_PACK_CATALOG,
  TOKEN_PACK_KEYS,
  TOKEN_PURCHASE_CURRENCY,
  type TokenPackKey,
} from '@/lib/token-packs';

type TxType = 'achat' | 'utilisation' | 'bonus';

interface Transaction {
  id: string;
  date: string;
  description: string;
  type: TxType;
  amount: number;
  balance: number;
}

function mapTxType(apiType: string): TxType {
  if (apiType === 'PURCHASE') return 'achat';
  if (apiType === 'USAGE') return 'utilisation';
  return 'bonus';
}

const TX_STYLE: Record<TxType, { label: string; className: string; icon: typeof ArrowUpRight }> = {
  achat: { label: 'Achat', className: 'bg-emerald-50 text-emerald-700', icon: ArrowUpRight },
  utilisation: { label: 'Utilisation', className: 'bg-red-50 text-red-600', icon: ArrowDownRight },
  bonus: { label: 'Bonus', className: 'bg-brand/10 text-brand', icon: Gift },
};

export default function JetonsPage() {
  const { toast } = useToast();
  const [selectedPack, setSelectedPack] = useState<TokenPackKey>('STANDARD');
  const [balance, setBalance] = useState<number | null>(null);
  const [usedThisMonth, setUsedThisMonth] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<{ balance: number }>('/api/tokens/wallet')
      .then((res) => {
        if (!cancelled) setBalance(res.balance);
      })
      .catch(() => undefined);
    api<{ used: number }>('/api/tokens/usage-this-month')
      .then((res) => {
        if (!cancelled) setUsedThisMonth(res.used);
      })
      .catch(() => undefined);
    api<{
      items: {
        id: string;
        date: string;
        description: string;
        type: string;
        amount: number;
        balance: number;
      }[];
    }>('/api/tokens/transactions')
      .then((res) => {
        if (!cancelled) {
          setTransactions(res.items.map((tx) => ({ ...tx, type: mapTxType(tx.type) })));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function buyTokens() {
    const pack = TOKEN_PACK_CATALOG[selectedPack];
    setBuying(true);
    try {
      const res = await api<{ paymentUrl: string }>('/api/orders', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: {
          amount: pack.priceFcfa,
          currency: TOKEN_PURCHASE_CURRENCY,
          metadata: { kind: 'token_purchase', packKey: pack.key },
        },
      });
      window.location.href = res.paymentUrl;
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erreur réseau. Réessaie.', 'error');
      setBuying(false);
    }
  }

  return (
    <DashboardShell active="tokens" searchPlaceholder="Rechercher une annonce, un contact…">
      {/* HEADER */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-sora text-xl font-semibold text-neutral-900 lg:text-[22px]">
            Jetons & visites virtuelles
          </h1>
          <p className="text-[13.5px] text-gray-400">
            Gérez votre solde de jetons et vos visites virtuelles 360°.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled
            title="Bientôt disponible"
            className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-black/[0.08] px-4 py-2.5 text-[13px] font-medium text-gray-400"
          >
            <Download className="h-[14px] w-[14px]" aria-hidden />
            <span className="hidden lg:inline">Exporter</span>
          </button>
          <button
            type="button"
            disabled={buying}
            onClick={() => void buyTokens()}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-brand/90 disabled:opacity-50"
          >
            <Coins className="h-[15px] w-[15px]" aria-hidden />
            <span className="lg:hidden">{buying ? '…' : 'Acheter'}</span>
            <span className="hidden lg:inline">
              {buying ? 'Traitement…' : 'Acheter des jetons'}
            </span>
          </button>
        </div>
      </div>

      {/* BALANCE CARDS */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-brand p-5 text-white">
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-xs font-medium text-white/70">Solde de jetons</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/15">
              <Coins className="h-4 w-4 text-white" aria-hidden />
            </span>
          </div>
          <p className="font-sora mb-1.5 text-3xl font-semibold">{balance ?? '—'}</p>
          <p className="text-xs text-white/70">Jetons disponibles</p>
        </div>

        <div className="rounded-2xl bg-white p-5">
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-xs font-medium text-gray-400">Jetons utilisés ce mois</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-100">
              <Zap className="h-4 w-4 text-amber-600" aria-hidden />
            </span>
          </div>
          <p className="font-sora mb-1.5 text-2xl font-semibold text-neutral-900">
            {usedThisMonth ?? '—'}
          </p>
        </div>
      </div>

      {/* TOKEN PACKS */}
      <div className="rounded-2xl bg-white p-5">
        <p className="font-sora mb-3.5 text-[15px] font-semibold text-neutral-900">
          Recharger votre solde
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TOKEN_PACK_KEYS.map((key) => {
            const pack = TOKEN_PACK_CATALOG[key];
            const active = selectedPack === key;
            const priceLabel = `${pack.priceFcfa.toLocaleString('fr-FR')} FCFA`;
            const perTokenLabel = `${Math.round(pack.priceFcfa / pack.tokens).toLocaleString('fr-FR')} FCFA/jeton`;
            return (
              <button
                key={pack.key}
                type="button"
                onClick={() => setSelectedPack(pack.key)}
                className={cn(
                  'relative flex flex-col rounded-xl border p-4 text-left transition-colors',
                  active
                    ? 'border-brand bg-brand/5'
                    : 'border-black/[0.08] hover:border-black/[0.16]',
                )}
              >
                {pack.key === 'STANDARD' && (
                  <span className="absolute -top-2.5 right-4 flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-white">
                    <Star className="h-2.5 w-2.5 fill-white" aria-hidden />
                    Populaire
                  </span>
                )}
                <p className="font-sora text-[13.5px] font-semibold text-neutral-900">
                  {pack.label}
                </p>
                <p className="font-sora mt-2 text-2xl font-semibold text-neutral-900">
                  {pack.tokens}
                  <span className="ml-1 text-xs font-normal text-gray-400">jetons</span>
                </p>
                <p className="mt-1 text-[13px] font-semibold text-brand">{priceLabel}</p>
                <p className="mt-0.5 text-[11.5px] text-gray-400">{perTokenLabel}</p>
                <div
                  className={cn(
                    'mt-3.5 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12.5px] font-semibold',
                    active ? 'bg-brand text-white' : 'bg-gray-50 text-neutral-700',
                  )}
                >
                  {active && <Check className="h-3.5 w-3.5" aria-hidden />}
                  {active ? 'Sélectionné' : 'Choisir'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* TRANSACTION HISTORY */}
      <div className="rounded-2xl bg-white">
        <div className="flex items-center justify-between border-b border-black/[0.06] p-5">
          <p className="font-sora text-[15px] font-semibold text-neutral-900">
            Historique des transactions
          </p>
          <button
            type="button"
            disabled
            title="Bientôt disponible"
            className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-black/[0.08] px-3 py-2 text-xs font-medium text-gray-400"
          >
            <Filter className="h-3.5 w-3.5" aria-hidden />
            Filtrer
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/[0.06]">
                {['Date', 'Description', 'Type', 'Montant', 'Solde'].map((h, i) => (
                  <th
                    key={h}
                    className={cn(
                      'font-sora px-5 py-3 text-left text-[11.5px] font-semibold whitespace-nowrap text-gray-400 uppercase',
                      i >= 3 && 'text-right',
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const style = TX_STYLE[tx.type];
                const Icon = style.icon;
                return (
                  <tr key={tx.id} className="border-b border-black/[0.04] last:border-0">
                    <td className="px-5 py-3.5 text-[13px] whitespace-nowrap text-gray-400">
                      {new Date(tx.date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-3.5 text-[13.5px] text-neutral-900">{tx.description}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold',
                          style.className,
                        )}
                      >
                        <Icon className="h-2.5 w-2.5" aria-hidden />
                        {style.label}
                      </span>
                    </td>
                    <td
                      className={cn(
                        'px-5 py-3.5 text-right text-[13.5px] font-semibold whitespace-nowrap',
                        tx.amount > 0 ? 'text-emerald-600' : 'text-red-600',
                      )}
                    >
                      {tx.amount > 0 ? '+' : ''}
                      {tx.amount}
                    </td>
                    <td className="px-5 py-3.5 text-right text-[13.5px] font-semibold whitespace-nowrap text-neutral-900">
                      {tx.balance}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
