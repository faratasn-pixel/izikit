// Illustrative only — no receipts/history UI reads real `Order` rows yet
// (would need an endpoint scoping Orders by "subscription-related" vs other
// purchases). Numbers reproduced verbatim from the Banani mockup. See
// .planning/banani/abonnement-paiement.md for the scope decision.
const ROWS = [
  {
    date: '15 juin 2025',
    desc: 'Abonnement Pro Agent',
    method: 'Orange Money',
    status: 'Payé',
    amount: '29 900 FCFA',
  },
  {
    date: '15 mai 2025',
    desc: 'Abonnement Pro Agent',
    method: 'Orange Money',
    status: 'Payé',
    amount: '29 900 FCFA',
  },
  {
    date: '15 avr. 2025',
    desc: 'Abonnement Pro Agent',
    method: 'Carte Visa ••4821',
    status: 'Remboursé',
    amount: '29 900 FCFA',
  },
];

export function PaymentHistoryCard() {
  return (
    <section className="rounded-xl bg-white p-6 lg:p-7">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-sora text-[15px] font-semibold text-neutral-900">
          Historique des paiements
        </h2>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold text-gray-500">
          Bientôt disponible
        </span>
      </div>
      <p className="mb-4 text-[13px] text-gray-500">
        Vos vrais paiements de changement de plan sont enregistrés comme des <code>Order</code> en
        base — un relevé dédié n&apos;est pas encore construit ici.
      </p>

      <div className="overflow-x-auto opacity-60">
        <table className="w-full min-w-[480px] border-collapse text-left">
          <thead>
            <tr>
              {['Date', 'Description', 'Méthode', 'Statut', 'Montant'].map((h) => (
                <th
                  key={h}
                  className="font-sora border-b border-black/[0.06] pb-3 text-[11px] font-semibold tracking-wide text-gray-400 uppercase last:text-right"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.date + row.desc}>
                <td className="border-b border-black/[0.06] py-3.5 text-[13px] text-gray-500">
                  {row.date}
                </td>
                <td className="border-b border-black/[0.06] py-3.5 text-[13px] font-medium text-neutral-900">
                  {row.desc}
                </td>
                <td className="border-b border-black/[0.06] py-3.5 text-[13px] text-gray-500">
                  {row.method}
                </td>
                <td className="border-b border-black/[0.06] py-3.5 text-[13px] text-neutral-700">
                  {row.status}
                </td>
                <td className="border-b border-black/[0.06] py-3.5 text-right text-[13px] font-semibold text-neutral-900">
                  {row.amount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
