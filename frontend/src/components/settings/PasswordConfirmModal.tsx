'use client';

import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';

interface PasswordConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  requirePassword: boolean;
  onCancel: () => void;
  onConfirm: (currentPassword: string) => Promise<void>;
}

// Reused by both danger-zone actions (deactivate / delete). Password is
// only asked for when the account actually has one — OAuth-only accounts
// have nothing to confirm against (see /api/auth/deactivate + /delete-account
// comments), so `requirePassword=false` skips straight to a plain confirm.
export function PasswordConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  destructive = false,
  requirePassword,
  onCancel,
  onConfirm,
}: PasswordConfirmModalProps) {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onConfirm(password);
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="font-sora text-base font-semibold text-neutral-900">{title}</h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Fermer"
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <p className="mb-5 text-[13.5px] text-gray-600">{description}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {requirePassword && (
            <TextField
              label="Mot de passe actuel"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button
              type="submit"
              disabled={submitting}
              className={destructive ? 'bg-red-600 hover:bg-red-700' : undefined}
            >
              {submitting ? 'Traitement…' : confirmLabel}
            </Button>
            <Button type="button" variant="social" onClick={onCancel}>
              Annuler
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
