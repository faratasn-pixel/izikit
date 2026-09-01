'use client';

import { useState, type FormEvent } from 'react';
import { Lock, Smartphone, BadgeCheck, Monitor } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth, type User } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';

const googleSignInHref = '/api/auth/oauth/google/start?next=/settings';
const facebookSignInHref = '/api/auth/oauth/facebook/start?next=/settings';

const PASSWORD_ERROR_MAP: Record<string, string> = {
  INVALID_CREDENTIALS: 'Mot de passe actuel incorrect.',
  PASSWORD_BANNED: 'Ce mot de passe est trop courant.',
  PASSWORD_TOO_SHORT: 'Mot de passe trop court.',
  PASSWORD_PWNED: 'Ce mot de passe a fuité — choisis-en un autre.',
  PASSWORD_ALREADY_SET: 'Un mot de passe est déjà défini. Utilise « changer le mot de passe ».',
  VALIDATION_FAILED: 'Champs invalides.',
  LOCKED_OUT: 'Compte temporairement verrouillé après plusieurs échecs.',
};

function LinkedProviderRow({
  label,
  linked,
  href,
}: {
  label: string;
  linked: boolean;
  href: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <span className="text-[13.5px] font-medium text-neutral-900">{label}</span>
      {linked ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
          Lié
        </span>
      ) : (
        <a
          href={href}
          className="rounded-lg border border-black/[0.08] px-3.5 py-1.5 text-[12.5px] font-semibold text-neutral-800 hover:bg-gray-50"
        >
          Lier
        </a>
      )}
    </div>
  );
}

export function SecurityCard({ user }: { user: User }) {
  const { refresh } = useAuth();
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);

  const hasPassword = user.hasPassword;
  const googleLinked = user.linkedProviders.includes('google');
  const facebookLinked = user.linkedProviders.includes('facebook');

  async function onSubmitPassword(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length === 0) {
      setError('Saisis un nouveau mot de passe.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }

    setSubmitting(true);
    try {
      if (hasPassword) {
        await api('/api/auth/change-password', {
          method: 'PUT',
          body: { currentPassword, newPassword },
        });
        toast('Mot de passe mis à jour.', 'success');
      } else {
        await api('/api/auth/set-password', {
          method: 'POST',
          body: { newPassword },
        });
        toast('Mot de passe défini.', 'success');
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? (PASSWORD_ERROR_MAP[err.code] ?? err.message)
          : 'Erreur réseau. Réessaie.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function onRevokeOthers() {
    setRevoking(true);
    try {
      await api('/api/auth/sessions/revoke-others', { method: 'POST' });
      toast('Tous les autres appareils ont été déconnectés.', 'success');
    } catch {
      toast('Impossible de déconnecter les autres appareils. Réessaie.', 'error');
    } finally {
      setRevoking(false);
    }
  }

  return (
    <section className="rounded-xl bg-white p-6 lg:p-7">
      <h2 className="font-sora text-[15px] font-semibold text-neutral-900">Sécurité</h2>
      <p className="mb-6 text-[13px] text-gray-500">
        Gérez votre mot de passe, vos comptes liés et vos sessions actives.
      </p>

      {/* Password */}
      <form
        onSubmit={onSubmitPassword}
        className="flex flex-col gap-4 border-b border-black/[0.06] pb-6"
      >
        <h3 className="text-[13.5px] font-semibold text-neutral-900">
          {hasPassword ? 'Changer le mot de passe' : 'Définir un mot de passe'}
        </h3>
        {hasPassword && (
          <TextField
            label="Mot de passe actuel"
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField
            label="Nouveau mot de passe"
            type="password"
            required
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <TextField
            label="Confirmer le nouveau mot de passe"
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <Button type="submit" disabled={submitting} className="sm:w-auto">
          {submitting
            ? 'Enregistrement…'
            : hasPassword
              ? 'Changer le mot de passe'
              : 'Définir le mot de passe'}
        </Button>
      </form>

      {/* Linked providers */}
      <div className="border-b border-black/[0.06] py-2">
        <h3 className="pt-4 text-[13.5px] font-semibold text-neutral-900">Comptes liés</h3>
        <LinkedProviderRow label="Google" linked={googleLinked} href={googleSignInHref} />
        <LinkedProviderRow label="Facebook" linked={facebookLinked} href={facebookSignInHref} />
      </div>

      {/* 2FA / identity verification — placeholders, no real system exists yet */}
      <div className="flex items-center gap-4 border-b border-black/[0.06] py-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
          <Smartphone className="h-[18px] w-[18px] text-gray-500" aria-hidden />
        </div>
        <div className="flex-1">
          <div className="text-[13.5px] font-medium text-neutral-900">
            Authentification à deux facteurs
          </div>
          <div className="text-xs text-gray-500">
            Protégez votre compte avec un code à chaque connexion
          </div>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold text-gray-400">
          Bientôt disponible
        </span>
      </div>

      <div className="flex items-center gap-4 border-b border-black/[0.06] py-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
          <BadgeCheck className="h-[18px] w-[18px] text-gray-500" aria-hidden />
        </div>
        <div className="flex-1">
          <div className="text-[13.5px] font-medium text-neutral-900">
            Vérification d&apos;identité
          </div>
          <div className="text-xs text-gray-500">
            Confirmez votre identité auprès de la plateforme
          </div>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold text-gray-400">
          Bientôt disponible
        </span>
      </div>

      {/* Active sessions — real global invalidation, no per-device tracking */}
      <div className="flex items-center gap-4 pt-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
          <Monitor className="h-[18px] w-[18px] text-gray-500" aria-hidden />
        </div>
        <div className="flex-1">
          <div className="text-[13.5px] font-medium text-neutral-900">Sessions actives</div>
          <div className="text-xs text-gray-500">
            Déconnectez toutes les autres sessions ouvertes avec votre compte
          </div>
        </div>
        <button
          type="button"
          onClick={() => void onRevokeOthers()}
          disabled={revoking}
          className="rounded-lg border border-red-200 px-3.5 py-1.5 text-[12.5px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          {revoking ? 'Déconnexion…' : 'Déconnecter tout'}
        </button>
      </div>
      <p className="pt-3 text-[11.5px] text-gray-400">
        <Lock className="mr-1 inline h-3 w-3" aria-hidden />
        Cette action ne déconnecte pas cet appareil-ci.
      </p>
    </section>
  );
}
