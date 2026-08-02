// /orders/[id]/failed — Bictorys hosted-checkout redirect target (see
// `failureUrl` in frontend/src/app/api/orders/route.ts). No DB read — see
// the success page's comment for why.
export default async function OrderFailedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="font-sora mb-3 text-2xl font-semibold text-neutral-900">Paiement échoué</h1>
      <p className="mb-6 text-gray-600">
        Le paiement n&apos;a pas pu être finalisé. Aucun montant n&apos;a été débité si la
        transaction a été annulée.
      </p>
      <p className="mb-8 text-sm text-gray-500">
        Référence : <code className="rounded bg-gray-100 px-2 py-1">{id}</code>
      </p>
      <a
        href="/settings"
        className="inline-block rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand/90"
      >
        Réessayer depuis les paramètres
      </a>
    </main>
  );
}
