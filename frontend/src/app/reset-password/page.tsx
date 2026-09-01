'use client';

import { Suspense, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  MessageSquareDot,
  LockKeyhole,
  Eye,
  EyeOff,
  Info,
  Check,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import { ResetStepIndicator } from '@/components/auth/ResetStepIndicator';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

function codeErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'VERIFICATION_CODE_INVALID':
        return 'Code de vérification invalide.';
      case 'VERIFICATION_CODE_EXPIRED':
        return 'Ce code a expiré. Recommencez la demande.';
      case 'TOO_MANY_RESET_ATTEMPTS':
        return 'Trop de tentatives. Réessayez dans quelques minutes.';
      case 'TOO_MANY_FORGOT_ATTEMPTS':
        return 'Trop de demandes de renvoi. Réessayez dans quelques instants.';
      case 'PASSWORD_BANNED':
        return 'Ce mot de passe est trop commun.';
      case 'PASSWORD_TOO_SHORT':
        return 'Mot de passe trop court (10 caractères minimum).';
      case 'PASSWORD_PWNED':
        return 'Ce mot de passe est apparu dans une fuite de données connue.';
      default:
        return err.message;
    }
  }
  return 'Une erreur est survenue. Réessayez.';
}

function passwordChecks(pw: string) {
  return {
    length: pw.length >= 10,
    uppercase: /[A-Z]/.test(pw),
    digit: /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
}

function strengthLevel(pw: string): { label: string; filled: number; color: string } {
  const checks = passwordChecks(pw);
  const score = Object.values(checks).filter(Boolean).length;
  if (pw.length === 0) return { label: '', filled: 0, color: 'bg-gray-200' };
  if (score <= 2) return { label: 'Faible', filled: score, color: 'bg-red-500' };
  if (score === 3) return { label: 'Moyen', filled: score, color: 'bg-amber-500' };
  return { label: 'Fort', filled: 4, color: 'bg-emerald-500' };
}

const RESEND_COOLDOWN_SECONDS = 60;

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email') ?? '';

  const [step, setStep] = useState<'code' | 'password'>('code');
  const [code, setCode] = useState(params.get('code') ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  async function resendCode() {
    setResending(true);
    setResendMessage(null);
    setError(null);
    try {
      await api('/api/auth/forgot-password', { method: 'POST', body: { email } });
      setResendMessage('Un nouveau code a été envoyé si ce compte existe.');
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'TOO_MANY_FORGOT_ATTEMPTS') {
        setError(codeErrorMessage(err));
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
      } else {
        setError(codeErrorMessage(err));
      }
    } finally {
      setResending(false);
    }
  }

  if (!email) {
    return (
      <AuthSplitLayout
        heroImageSrc="https://storage.googleapis.com/banani-generated-images/generated-images/e38fdee5-5b44-46e2-a87d-385be6b8686a.jpg"
        heroImageAlt="Architecture moderne ouest-africaine"
        heroTitle={<>Réinitialisation du mot de passe</>}
        heroSubtitle="Des milliers de biens vérifiés. Des agents de confiance. Une plateforme simple."
        activeDot={0}
      >
        <p className="text-base text-gray-500">
          Adresse e-mail manquante. Recommencez depuis{' '}
          <Link href="/forgot-password" className="font-medium text-brand">
            Mot de passe oublié
          </Link>
          .
        </p>
      </AuthSplitLayout>
    );
  }

  function onSubmitCode(e: FormEvent) {
    e.preventDefault();
    // No separate "verify code" endpoint exists — code + newPassword are
    // checked together, atomically, by /api/auth/reset-password (avoids
    // exposing a code-guessing oracle). This step only validates the format
    // locally before moving on.
    setError(null);
    if (code.trim().length !== 8) {
      setError('Le code doit contenir 8 caractères.');
      return;
    }
    setStep('password');
  }

  async function onSubmitPassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setSubmitting(true);
    try {
      await api('/api/auth/reset-password', {
        method: 'POST',
        body: { email, code: code.trim().toUpperCase(), newPassword },
      });
      router.push('/reset-password/success');
    } catch (err) {
      setError(codeErrorMessage(err));
      if (err instanceof ApiError && err.code.startsWith('VERIFICATION_CODE')) {
        setStep('code');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const checks = passwordChecks(newPassword);
  const strength = strengthLevel(newPassword);

  return (
    <AuthSplitLayout
      heroImageSrc="https://storage.googleapis.com/banani-generated-images/generated-images/e38fdee5-5b44-46e2-a87d-385be6b8686a.jpg"
      heroImageAlt="Architecture moderne ouest-africaine"
      heroTitle={
        <>
          Trouvez votre <span className="text-brand">chez-vous</span> en Afrique
        </>
      }
      heroSubtitle="Des milliers de biens vérifiés. Des agents de confiance. Une plateforme simple."
      activeDot={0}
      topRight={
        <button
          type="button"
          onClick={() => (step === 'password' ? setStep('code') : router.push('/forgot-password'))}
          className="flex items-center gap-1.5 rounded-[10px] border-[1.5px] border-black/[0.08] bg-white px-4.5 py-2 text-sm font-medium text-neutral-900"
        >
          <ArrowLeft className="h-4 w-4 text-neutral-700" aria-hidden />
          Retour
        </button>
      }
    >
      {step === 'code' ? (
        <>
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand/10">
            <MessageSquareDot className="h-7 w-7 text-brand" aria-hidden />
          </div>
          <div className="mb-9">
            <h2 className="font-sora mb-2 text-2xl leading-[1.2] font-semibold text-neutral-900 md:text-[32px]">
              Code de <span className="text-brand">vérification</span>
            </h2>
            <p className="max-w-md text-base text-gray-500">
              Un code de vérification a été envoyé à l&apos;adresse email associée à ce compte.
              Saisissez-le ci-dessous pour continuer.
            </p>
          </div>

          <ResetStepIndicator activeStep={2} />

          <form onSubmit={onSubmitCode} className="flex flex-col gap-5">
            <TextField
              label="Code de vérification"
              type="text"
              required
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="one-time-code"
              maxLength={8}
              className="font-mono tracking-[0.3em] uppercase"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />

            <div className="flex items-start gap-2.5 rounded-[10px] bg-brand/[0.06] px-4 py-3.5">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand" aria-hidden />
              <p className="text-[13px] leading-relaxed text-neutral-700">
                Vérifiez vos emails. Si vous ne recevez rien après quelques minutes, vous pouvez
                demander un nouveau code ci-dessous.
              </p>
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            {resendMessage && !error && (
              <p role="status" className="text-sm text-green-600">
                {resendMessage}
              </p>
            )}

            <Button type="submit">
              Vérifier le code
              <ArrowRight className="h-[18px] w-[18px]" aria-hidden />
            </Button>

            <button
              type="button"
              onClick={() => void resendCode()}
              disabled={resending || resendCooldown > 0}
              className="text-center text-[13px] font-medium text-brand disabled:cursor-not-allowed disabled:text-gray-400"
            >
              {resendCooldown > 0
                ? `Renvoyer le code (${resendCooldown}s)`
                : resending
                  ? 'Envoi en cours…'
                  : 'Renvoyer le code'}
            </button>

            <p className="text-center text-[13px] text-gray-500">
              Vous avez retrouvé votre mot de passe ?{' '}
              <Link href="/login" className="font-medium text-brand">
                Se connecter
              </Link>
            </p>
          </form>
        </>
      ) : (
        <>
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand/10">
            <LockKeyhole className="h-7 w-7 text-brand" aria-hidden />
          </div>
          <div className="mb-9">
            <h2 className="font-sora mb-2 text-2xl leading-[1.2] font-semibold text-neutral-900 md:text-[32px]">
              Nouveau <span className="text-brand">mot de passe</span>
            </h2>
            <p className="max-w-md text-base text-gray-500">
              Choisissez un mot de passe fort et sécurisé pour protéger votre compte HABITAT-AFRIK.
            </p>
          </div>

          <ResetStepIndicator activeStep={3} />

          <form onSubmit={onSubmitPassword} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <TextField
                label="Nouveau mot de passe"
                type={showPassword ? 'text' : 'password'}
                placeholder="Au moins 10 caractères"
                required
                minLength={10}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
                    }
                    className="flex items-center focus-visible:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="h-[18px] w-[18px]" aria-hidden />
                    ) : (
                      <Eye className="h-[18px] w-[18px]" aria-hidden />
                    )}
                  </button>
                }
              />

              {newPassword.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Force du mot de passe</span>
                    <span className="text-xs font-semibold text-neutral-700">{strength.label}</span>
                  </div>
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          'h-1 flex-1 rounded-full',
                          i < strength.filled ? strength.color : 'bg-gray-200',
                        )}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-1.5 flex flex-col gap-1.5">
                <RequirementItem valid={checks.length} label="Au moins 10 caractères" />
                <RequirementItem valid={checks.uppercase} label="Une lettre majuscule" />
                <RequirementItem valid={checks.digit} label="Un chiffre" />
                <RequirementItem valid={checks.special} label="Un caractère spécial (!@#$…)" />
              </div>
            </div>

            <TextField
              label="Confirmer le mot de passe"
              type={showConfirm ? 'text' : 'password'}
              placeholder="Retapez le mot de passe"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              trailing={
                confirmPassword.length > 0 && confirmPassword === newPassword ? (
                  <Check className="h-[18px] w-[18px] text-emerald-500" aria-hidden />
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={
                      showConfirm ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
                    }
                    className="flex items-center focus-visible:outline-none"
                  >
                    {showConfirm ? (
                      <EyeOff className="h-[18px] w-[18px]" aria-hidden />
                    ) : (
                      <Eye className="h-[18px] w-[18px]" aria-hidden />
                    )}
                  </button>
                )
              }
            />

            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}

            <Button type="submit" disabled={submitting}>
              {submitting ? 'Réinitialisation…' : 'Réinitialiser le mot de passe'}
              <ArrowRight className="h-[18px] w-[18px]" aria-hidden />
            </Button>

            <p className="text-center text-[13px] text-gray-500">
              Vous avez retrouvé votre mot de passe ?{' '}
              <Link href="/login" className="font-medium text-brand">
                Se connecter
              </Link>
            </p>
          </form>
        </>
      )}
    </AuthSplitLayout>
  );
}

function RequirementItem({ valid, label }: { valid: boolean; label: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 text-xs',
        valid ? 'text-emerald-600' : 'text-gray-500',
      )}
    >
      <span
        className={cn(
          'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full',
          valid ? 'bg-emerald-500' : 'bg-gray-200',
        )}
      >
        {valid && <Check className="h-2.5 w-2.5 text-white" aria-hidden />}
      </span>
      {label}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
