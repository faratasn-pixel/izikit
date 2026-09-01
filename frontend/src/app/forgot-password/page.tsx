'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, KeyRound, Info, Mail } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import { ResetStepIndicator } from '@/components/auth/ResetStepIndicator';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'TOO_MANY_FORGOT_ATTEMPTS':
        return 'Trop de demandes. Réessayez dans quelques instants.';
      default:
        return err.message;
    }
  }
  return 'Une erreur est survenue. Réessayez.';
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      // Enumeration-resistant: the API always returns { ok: true }. Always
      // advance to the code-entry step regardless of whether an account
      // matched this email (D-23).
      await api('/api/auth/forgot-password', { method: 'POST', body: { email } });
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

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
        <Link
          href="/login"
          className="flex items-center gap-1.5 rounded-[10px] border-[1.5px] border-black/[0.08] bg-white px-4.5 py-2 text-sm font-medium text-neutral-900"
        >
          <ArrowLeft className="h-4 w-4 text-neutral-700" aria-hidden />
          Retour à la connexion
        </Link>
      }
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand/10">
        <KeyRound className="h-7 w-7 text-brand" aria-hidden />
      </div>

      <div className="mb-9">
        <h2 className="font-sora mb-2 text-2xl leading-[1.2] font-semibold text-neutral-900 md:text-[32px]">
          Mot de passe <span className="text-brand">oublié ?</span>
        </h2>
        <p className="max-w-md text-base text-gray-500">
          Entrez votre adresse e-mail ci-dessous. Vous recevrez un code de vérification pour
          réinitialiser votre mot de passe.
        </p>
      </div>

      <ResetStepIndicator activeStep={1} />

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <TextField
          label="Adresse e-mail"
          type="email"
          placeholder="votre@email.com"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          trailing={<Mail className="h-4 w-4" aria-hidden />}
        />

        <div className="flex items-start gap-2.5 rounded-[10px] bg-brand/[0.06] px-4 py-3.5">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand" aria-hidden />
          <p className="text-[13px] leading-relaxed text-neutral-700">
            Un code de vérification sera envoyé à cette adresse si elle est associée à un compte.
            Assurez-vous que l&apos;adresse est correcte avant de continuer.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Envoi…' : 'Envoyer le code de vérification'}
          <ArrowRight className="h-[18px] w-[18px]" aria-hidden />
        </Button>

        <p className="text-center text-[13px] text-gray-500">
          Vous avez retrouvé votre mot de passe ?{' '}
          <Link href="/login" className="font-medium text-brand">
            Se connecter
          </Link>
        </p>
      </form>
    </AuthSplitLayout>
  );
}
