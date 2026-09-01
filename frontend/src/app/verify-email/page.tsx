'use client';

// No Banani screen selected for this step yet — styled with the same brand
// primitives as /login and /signup rather than a literal Banani source.
import { Suspense, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { MailCheck } from 'lucide-react';
import { api, ApiError, storeCsrfToken } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'VERIFICATION_CODE_INVALID':
        return 'Code de vérification invalide.';
      case 'VERIFICATION_CODE_EXPIRED':
        return 'Ce code a expiré. Demandez-en un nouveau.';
      case 'TOO_MANY_VERIFY_ATTEMPTS':
        return 'Trop de tentatives. Réessayez dans quelques minutes.';
      default:
        return err.message;
    }
  }
  return 'Une erreur est survenue. Réessayez.';
}

const RESEND_COOLDOWN_SECONDS = 60;

function VerifyEmailForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useAuth();
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [code, setCode] = useState(params.get('code') ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Links from the verification email carry both params — submit automatically.
  useEffect(() => {
    const qEmail = params.get('email');
    const qCode = params.get('code');
    if (qEmail && qCode) {
      void verify(qEmail, qCode);
    }
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  async function resendCode() {
    if (!email) {
      setError('Renseignez votre adresse e-mail pour recevoir un nouveau code.');
      return;
    }
    setResending(true);
    setResendMessage(null);
    setError(null);
    try {
      await api('/api/auth/resend-verification', {
        method: 'POST',
        body: { email },
      });
      setResendMessage('Un nouveau code a été envoyé si ce compte existe.');
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'TOO_MANY_RESEND_ATTEMPTS') {
        setError(err.message);
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setResending(false);
    }
  }

  async function verify(emailValue: string, codeValue: string) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await api<{ csrfToken?: string }>('/api/auth/verify-email', {
        method: 'POST',
        body: { email: emailValue, code: codeValue },
      });
      if (res.csrfToken) storeCsrfToken(res.csrfToken);
      await refresh();
      router.push('/dashboard');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void verify(email, code);
  }

  return (
    <AuthSplitLayout
      heroImageSrc="https://storage.googleapis.com/banani-generated-images/generated-images/e38fdee5-5b44-46e2-a87d-385be6b8686a.jpg"
      heroImageAlt="Architecture moderne ouest-africaine"
      heroTitle={
        <>
          Vous y êtes <span className="text-brand">presque</span>
        </>
      }
      heroSubtitle="Un dernier code, et vous accédez à votre compte HABITAT-AFRIK."
      activeDot={2}
    >
      <div className="mb-9">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand/10">
          <MailCheck className="h-6 w-6 text-brand" aria-hidden />
        </div>
        <h2 className="font-sora mb-2 text-2xl leading-[1.2] font-semibold text-neutral-900 md:text-[30px]">
          Vérifiez votre e-mail
        </h2>
        <p className="text-base text-gray-500">
          Nous avons envoyé un code à 8 caractères à votre adresse e-mail. Il expire dans 15
          minutes.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-[18px]">
        <TextField
          label="Adresse e-mail"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
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

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Vérification…' : 'Vérifier'}
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
          Vous n&apos;avez rien reçu ?{' '}
          <Link href="/signup" className="font-medium text-brand">
            Recommencer l&apos;inscription
          </Link>
        </p>
      </form>
    </AuthSplitLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailForm />
    </Suspense>
  );
}
