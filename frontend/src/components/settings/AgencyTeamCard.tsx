import { Users, UserPlus } from 'lucide-react';

// Phase 2 (deferred, confirmed with the user) — team invite-by-email +
// member roles/status need a real invite flow (pending members without a
// User row yet) that doesn't exist. Placeholder only, no fabricated data.
export function AgencyTeamCard() {
  return (
    <section className="rounded-xl bg-white p-6 lg:p-7">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="font-sora text-[15px] font-semibold text-neutral-900">
          Équipe de l&apos;agence
        </h2>
        <button
          type="button"
          disabled
          title="Bientôt disponible"
          className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-gray-100 px-3.5 py-2 text-[12.5px] font-semibold text-gray-400"
        >
          <UserPlus className="h-3.5 w-3.5" aria-hidden />
          Inviter un membre
        </button>
      </div>
      <p className="mb-4 text-[13px] text-gray-500">
        Gérez les agents et collaborateurs rattachés à votre agence.
      </p>
      <div className="flex flex-col items-center gap-2 rounded-lg bg-gray-50 py-10 text-center">
        <Users className="h-6 w-6 text-gray-300" aria-hidden />
        <p className="text-[13px] font-medium text-gray-400">Bientôt disponible</p>
        <p className="max-w-xs text-xs text-gray-400">
          Les invitations d&apos;équipe par email arrivent dans une prochaine mise à jour.
        </p>
      </div>
    </section>
  );
}
