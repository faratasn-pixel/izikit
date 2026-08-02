'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuth, type User } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { PasswordConfirmModal } from './PasswordConfirmModal';

const DANGER_ERROR_MAP: Record<string, string> = {
  INVALID_CREDENTIALS: 'Mot de passe incorrect.',
  PASSWORD_REQUIRED: 'Mot de passe requis.',
  LOCKED_OUT: 'Compte temporairement verrouillé après plusieurs échecs.',
  LAST_SUPERADMIN:
    'Vous êtes le seul SUPERADMIN actif — promouvez un autre administrateur avant de continuer.',
};

export function DangerZoneCard({ user }: { user: User }) {
  const router = useRouter();
  const { refresh } = useAuth();
  const { toast } = useToast();
  const [modal, setModal] = useState<'deactivate' | 'delete' | null>(null);

  async function afterSuccess(message: string) {
    toast(message, 'success');
    setModal(null);
    await refresh();
    router.replace('/login');
  }

  async function onConfirm(currentPassword: string) {
    const path = modal === 'delete' ? '/api/auth/delete-account' : '/api/auth/deactivate';
    try {
      await api(path, {
        method: 'POST',
        body: currentPassword ? { currentPassword } : {},
      });
      await afterSuccess(modal === 'delete' ? 'Compte supprimé.' : 'Compte désactivé.');
    } catch (err) {
      const code = err instanceof ApiError ? err.code : undefined;
      const message =
        code && DANGER_ERROR_MAP[code] ? DANGER_ERROR_MAP[code] : 'Une erreur est survenue.';
      throw new Error(message);
    }
  }

  return (
    <section className="rounded-xl border border-red-200 bg-white p-6 lg:p-7">
      <h2 className="font-sora text-[15px] font-semibold text-red-800">Zone de danger</h2>
      <p className="mb-2 text-[13px] text-gray-500">
        Ces actions sont irréversibles. Agissez avec précaution.
      </p>

      <div className="flex items-center justify-between gap-4 border-b border-black/[0.06] py-3.5">
        <div>
          <div className="text-[13.5px] font-medium text-neutral-900">Désactiver mon compte</div>
          <div className="text-xs text-gray-500">
            Votre compte sera suspendu (déconnexion immédiate sur tous les appareils) mais vos
            données seront conservées. Seul un administrateur peut le réactiver.
          </div>
        </div>
        <button
          type="button"
          onClick={() => setModal('deactivate')}
          className="flex-shrink-0 rounded-lg border border-amber-300 px-3.5 py-1.5 text-[12.5px] font-semibold text-amber-800 hover:bg-amber-50"
        >
          Désactiver
        </button>
      </div>

      <div className="flex items-center justify-between gap-4 pt-3.5">
        <div>
          <div className="text-[13.5px] font-medium text-red-800">
            Supprimer définitivement mon compte
          </div>
          <div className="text-xs text-gray-500">
            Vos données personnelles (nom, téléphone, ville, pays, bio) sont effacées et vos comptes
            liés déconnectés. L&apos;historique des annonces, commandes et retraits est conservé
            conformément aux obligations comptables et n&apos;est plus rattaché à vous
            personnellement.
          </div>
        </div>
        <button
          type="button"
          onClick={() => setModal('delete')}
          className="flex-shrink-0 rounded-lg bg-red-600 px-3.5 py-1.5 text-[12.5px] font-semibold text-white hover:bg-red-700"
        >
          Supprimer
        </button>
      </div>

      <PasswordConfirmModal
        open={modal === 'deactivate'}
        title="Désactiver le compte"
        description="Vous serez immédiatement déconnecté de tous vos appareils. Confirmez avec votre mot de passe."
        confirmLabel="Désactiver mon compte"
        requirePassword={user.hasPassword}
        onCancel={() => setModal(null)}
        onConfirm={onConfirm}
      />
      <PasswordConfirmModal
        open={modal === 'delete'}
        title="Supprimer le compte"
        description="Cette action est irréversible. Confirmez avec votre mot de passe."
        confirmLabel="Supprimer définitivement"
        destructive
        requirePassword={user.hasPassword}
        onCancel={() => setModal(null)}
        onConfirm={onConfirm}
      />
    </section>
  );
}
