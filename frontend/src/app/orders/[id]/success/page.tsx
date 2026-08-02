// /orders/[id]/success — Bictorys hosted-checkout redirect target (see
// `successUrl` in frontend/src/app/api/orders/route.ts). Deliberately reads
// nothing from the DB: by the time the browser lands here, the webhook has
// already confirmed payment and applied any side-effect (e.g. activating a
// subscription plan) server-side. This page is generic receipt copy, not a
// literal Banani screen.
export default async function OrderSuccessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="font-sora mb-3 text-2xl font-semibold text-neutral-900">Paiement confirmé</h1>
      <p className="mb-6 text-gray-600">
        Merci — votre paiement a été reçu et votre compte a été mis à jour.
      </p>
      <p className="mb-8 text-sm text-gray-500">
        Référence : <code className="rounded bg-gray-100 px-2 py-1">{id}</code>
      </p>
      <a
        href="/settings"
        className="inline-block rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand/90"
      >
        Retour aux paramètres
      </a>
    </main>
  );
}
