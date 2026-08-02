// Illustrative only — no payment-method storage/tokenization exists yet
// (would need real PCI-scoped card tokenization or Mobile Money wallet
// linking). Numbers reproduced verbatim from the Banani mockup. See
// .planning/banani/abonnement-paiement.md for the scope decision.
import { CreditCard, Smartphone } from 'lucide-react';

const METHODS = [
  {
    label: 'Mobile Money — Orange Money',
    detail: '+229 97 12 34 56 · Par défaut',
    icon: Smartphone,
  },
  { label: 'Mobile Money — MTN MoMo', detail: '+229 91 44 78 23', icon: Smartphone },
  { label: 'Carte bancaire Visa', detail: '•••• •••• •••• 4821 · Expire 09/27', icon: CreditCard },
];

export function PaymentMethodsCard() {
  return (
    <section className="rounded-xl bg-white p-6 lg:p-7">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-sora text-[15px] font-semibold text-neutral-900">
          Méthodes de paiement
        </h2>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold text-gray-500">
          Bientôt disponible
        </span>
      </div>
      <p className="mb-4 text-[13px] text-gray-500">
        L&apos;enregistrement de moyens de paiement n&apos;est pas encore implémenté — le paiement
        d&apos;un changement de plan se fait via la page de paiement Bictorys à chaque fois.
      </p>

      <div className="flex flex-col gap-2.5 opacity-60">
        {METHODS.map((m) => (
          <div
            key={m.label}
            className="flex items-center gap-4 rounded-lg border border-black/[0.06] bg-gray-50 px-4 py-3.5"
          >
            <div className="flex h-9 w-11 flex-shrink-0 items-center justify-center rounded-md border border-black/[0.06] bg-white">
              <m.icon className="h-4 w-4 text-neutral-600" aria-hidden />
            </div>
            <div className="flex-1">
              <div className="text-[13.5px] font-medium text-neutral-900">{m.label}</div>
              <div className="text-xs text-gray-500">{m.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
