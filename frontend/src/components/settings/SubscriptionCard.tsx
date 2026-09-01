'use client';

import { useEffect, useState } from 'react';
import { Check, XCircle, Zap } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import {
  PLAN_CATALOG,
  PLAN_KEYS,
  SUBSCRIPTION_CURRENCY,
  type PlanKey,
} from '@/lib/subscription-plans';
import { PasswordConfirmModal } from './PasswordConfirmModal';

interface Subscription {
  planKey: PlanKey;
  status: 'ACTIVE' | 'CANCELED';
  currentPeriodEnd: string | null;
  canceledAt: string | null;
}

function formatFcfa(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} FCFA`;
}

export function SubscriptionCard() {
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [busyPlan, setBusyPlan] = useState<PlanKey | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<{ subscription: Subscription }>('/api/subscriptions/me')
      .then((res) => {
        if (!cancelled) setSubscription(res.subscription);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const currentPlanKey = subscription?.planKey ?? 'FREE';
  const currentPlan = PLAN_CATALOG[currentPlanKey];

  async function changeToFree() {
    setBusyPlan('FREE');
    try {
      const res = await api<{ subscription: Subscription }>('/api/subscriptions/change-plan', {
        method: 'POST',
        body: { planKey: 'FREE' },
      });
      setSubscription(res.subscription);
      toast('Plan Gratuit activé.', 'success');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erreur réseau. Réessaie.', 'error');
    } finally {
      setBusyPlan(null);
    }
  }

  async function upgradeTo(planKey: PlanKey) {
    const plan = PLAN_CATALOG[planKey];
    setBusyPlan(planKey);
    try {
      const res = await api<{ paymentUrl: string }>('/api/orders', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: {
          amount: plan.priceFcfa,
          currency: SUBSCRIPTION_CURRENCY,
          metadata: { kind: 'subscription_plan_change', planKey },
        },
      });
      window.location.href = res.paymentUrl;
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erreur réseau. Réessaie.', 'error');
      setBusyPlan(null);
    }
  }

  async function confirmCancelSubscription() {
    try {
      const res = await api<{ subscription: Subscription }>('/api/subscriptions/cancel', {
        method: 'POST',
      });
      setSubscription(res.subscription);
      toast('Abonnement résilié.', 'success');
      setConfirmCancel(false);
    } catch (err) {
      throw new Error(err instanceof ApiError ? err.message : 'Erreur réseau. Réessaie.');
    }
  }

  function onPlanAction(planKey: PlanKey) {
    if (planKey === currentPlanKey) return;
    if (planKey === 'FREE') void changeToFree();
    else void upgradeTo(planKey);
  }

  return (
    <>
      <div className="mb-5 rounded-xl bg-gradient-to-br from-brand to-brand/80 p-7">
        <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white">
          <Zap className="h-2.5 w-2.5" aria-hidden />
          Plan actif
        </div>
        <h2 className="font-sora mb-1.5 text-xl font-semibold text-white">{currentPlan.label}</h2>
        <div className="mb-4 flex items-baseline gap-2">
          <span className="font-sora text-3xl font-semibold text-white">
            {formatFcfa(currentPlan.priceFcfa)}
          </span>
          {currentPlan.priceFcfa > 0 && (
            <span className="text-sm text-white/75">par mois, taxes comprises</span>
          )}
        </div>
        {subscription?.currentPeriodEnd && (
          <p className="text-[13px] text-white/80">
            {subscription.status === 'CANCELED'
              ? `Résilié — accès jusqu'au ${new Date(subscription.currentPeriodEnd).toLocaleDateString('fr-FR')}`
              : `Renouvellement le ${new Date(subscription.currentPeriodEnd).toLocaleDateString('fr-FR')}`}
          </p>
        )}
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        {PLAN_KEYS.map((key) => {
          const plan = PLAN_CATALOG[key];
          const isCurrent = key === currentPlanKey;
          return (
            <div
              key={key}
              className={
                isCurrent
                  ? 'relative rounded-xl border-2 border-brand bg-white p-6'
                  : 'relative rounded-xl border-2 border-transparent bg-white p-6'
              }
            >
              {isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 text-[10px] font-semibold whitespace-nowrap text-white">
                  Plan actuel
                </span>
              )}
              <h3 className="font-sora text-[15px] font-semibold text-neutral-900">{plan.label}</h3>
              <p className="mb-4 text-xs text-gray-500">{plan.description}</p>
              <div
                className={
                  isCurrent
                    ? 'font-sora text-2xl font-semibold text-brand'
                    : 'font-sora text-2xl font-semibold text-neutral-900'
                }
              >
                {formatFcfa(plan.priceFcfa)}
              </div>
              <p className="mb-5 text-xs text-gray-500">
                {plan.priceFcfa === 0 ? 'À vie' : 'par mois'}
              </p>
              <ul className="mb-5 flex flex-col gap-2">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-[12.5px] text-neutral-700"
                  >
                    <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
                      <Check className="h-2.5 w-2.5 text-emerald-700" aria-hidden />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={busyPlan !== null}
                onClick={() => onPlanAction(key)}
                className={
                  isCurrent
                    ? 'w-full cursor-default rounded-lg border border-brand px-4 py-2.5 text-[13px] font-semibold text-brand'
                    : 'w-full rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-brand/90 disabled:opacity-50'
                }
              >
                {isCurrent
                  ? 'Plan actuel'
                  : busyPlan === key
                    ? 'Traitement…'
                    : plan.priceFcfa === 0
                      ? 'Rétrograder'
                      : `Passer à ${plan.label}`}
              </button>
            </div>
          );
        })}
      </div>

      {currentPlanKey !== 'FREE' && subscription?.status === 'ACTIVE' && (
        <section className="rounded-xl border border-red-200 bg-white p-6">
          <h2 className="font-sora text-[15px] font-semibold text-red-800">
            Résilier l&apos;abonnement
          </h2>
          <p className="mb-4 text-[13px] text-gray-500">
            La résiliation prend effet immédiatement dans votre compte. Aucun renouvellement
            automatique n&apos;existe encore sur cette plateforme — l&apos;accès n&apos;est pas
            techniquement coupé à une date précise.
          </p>
          <button
            type="button"
            onClick={() => setConfirmCancel(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-[13px] font-semibold text-red-700 hover:bg-red-100"
          >
            <XCircle className="h-3.5 w-3.5" aria-hidden />
            Résilier mon abonnement
          </button>
        </section>
      )}

      <PasswordConfirmModal
        open={confirmCancel}
        title="Résilier l'abonnement ?"
        description="Vous repasserez sur le suivi du plan Gratuit. Cette action est immédiate."
        confirmLabel="Résilier"
        destructive
        requirePassword={false}
        onCancel={() => setConfirmCancel(false)}
        onConfirm={confirmCancelSubscription}
      />
    </>
  );
}
