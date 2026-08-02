// Illustrative only — no token/wallet ledger or "visites virtuelles" domain
// model exists yet. Numbers reproduced verbatim from the Banani mockup
// (48 jetons / 3 sur 5 visites / 12 jetons dépensés). See
// .planning/banani/abonnement-paiement.md for the scope decision.
import { Coins, History, Video } from 'lucide-react';

export function TokensCard() {
  return (
    <section className="rounded-xl bg-white p-6 lg:p-7">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-sora text-[15px] font-semibold text-neutral-900">
          Jetons &amp; visites virtuelles
        </h2>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold text-gray-500">
          Bientôt disponible
        </span>
      </div>
      <p className="mb-2 text-[13px] text-gray-500">
        Solde illustratif — le système de jetons et les visites virtuelles ne sont pas encore
        implémentés sur cette plateforme.
      </p>

      <div className="divide-y divide-black/[0.06] opacity-60">
        <div className="flex items-center gap-4 py-4">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-brand/10">
            <Coins className="h-5 w-5 text-brand" aria-hidden />
          </div>
          <div className="flex-1">
            <div className="text-[13.5px] font-medium text-neutral-900">Jetons disponibles</div>
            <div className="text-xs text-gray-500">
              Utilisables pour débloquer des visites virtuelles supplémentaires
            </div>
          </div>
          <div className="font-sora text-xl font-semibold text-neutral-900">48</div>
        </div>

        <div className="flex items-center gap-4 py-4">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-brand/10">
            <Video className="h-5 w-5 text-brand" aria-hidden />
          </div>
          <div className="flex-1">
            <div className="text-[13.5px] font-medium text-neutral-900">
              Visites virtuelles ce mois
            </div>
            <div className="text-xs text-gray-500">Incluses dans le plan Pro Agent (5/mois)</div>
          </div>
          <div className="font-sora text-xl font-semibold text-neutral-900">
            3 <span className="text-sm font-normal text-gray-400">/ 5</span>
          </div>
        </div>

        <div className="flex items-center gap-4 py-4">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-brand/10">
            <History className="h-5 w-5 text-brand" aria-hidden />
          </div>
          <div className="flex-1">
            <div className="text-[13.5px] font-medium text-neutral-900">
              Jetons utilisés ce mois
            </div>
            <div className="text-xs text-gray-500">12 jetons dépensés</div>
          </div>
        </div>
      </div>
    </section>
  );
}
