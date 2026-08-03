'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import { api, ApiError, storeCsrfToken } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';

// Top-level browser navigation (not a fetch) so the OAuth provider's callback
// redirect can set cookies via a normal 302 — mirrors the Google pattern from
// examples/frontend-pages/login.tsx.
const googleSignInHref = '/api/auth/oauth/google/start?next=/dashboard';
const facebookSignInHref = '/api/auth/oauth/facebook/start?next=/dashboard';

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'INVALID_CREDENTIALS':
        return 'Adresse email ou mot de passe incorrect.';
      case 'LOCKED_OUT':
        return 'Compte temporairement verrouillé. Réessayez plus tard.';
      case 'ACCOUNT_SUSPENDED':
        return 'Ce compte a été suspendu. Contactez le support.';
      case 'TOO_MANY_LOGIN_ATTEMPTS':
        return 'Trop de tentatives. Réessayez dans quelques minutes.';
      case 'EMAIL_NOT_VERIFIED':
        return 'Adresse email non vérifiée. Vérifiez votre boîte mail, ou demandez un nouveau code ci-dessous.';
      default:
        return err.message;
    }
  }
  return 'Une erreur est survenue. Réessayez.';
}

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setNeedsVerification(false);
    try {
      const res = await api<{ csrfToken?: string }>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      if (res.csrfToken) storeCsrfToken(res.csrfToken);
      await refresh();
      router.push('/dashboard');
    } catch (err) {
      setError(errorMessage(err));
      setNeedsVerification(err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED');
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
          href="/signup"
          className="flex items-center gap-1.5 rounded-[10px] border-[1.5px] border-black/[0.08] bg-white px-4.5 py-2 text-sm font-medium text-neutral-900"
        >
          <UserPlus className="h-4 w-4 text-neutral-700" aria-hidden />
          S&apos;inscrire
        </Link>
      }
    >
      <div className="mb-9">
        <h2 className="font-sora mb-2 text-2xl leading-[1.2] font-semibold text-neutral-900 md:text-[32px]">
          Bon retour sur
          <br />
          <span className="text-brand">HABITAT-AFRIK</span>
        </h2>
        <p className="text-base text-gray-500 md:text-lg">
          Connectez-vous à votre compte pour continuer
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <TextField
          label="Adresse Email"
          type="email"
          placeholder="vous@exemple.com"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <TextField
          label="Mot de passe"
          type={showPassword ? 'text' : 'password'}
          placeholder="Votre mot de passe"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          labelSlot={
            <Link href="/forgot-password" className="text-[13px] font-medium text-brand">
              Mot de passe oublié ?
            </Link>
          }
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
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

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
            {needsVerification && (
              <>
                {' '}
                <Link
                  href={`/verify-email?email=${encodeURIComponent(email)}`}
                  className="font-medium underline"
                >
                  Vérifier mon email
                </Link>
              </>
            )}
          </p>
        )}

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Connexion…' : 'Se connecter'}
        </Button>

        <div className="my-1 flex items-center gap-3">
          <div className="h-px flex-1 bg-black/[0.08]" />
          <span className="text-[13px] whitespace-nowrap text-gray-400">Ou continuer avec</span>
          <div className="h-px flex-1 bg-black/[0.08]" />
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <a href={googleSignInHref} className="flex-1">
            <Button type="button" variant="social" className="w-full">
              <GoogleIcon />
              Continuer avec Google
            </Button>
          </a>
          <a href={facebookSignInHref} className="flex-1">
            <Button type="button" variant="social" className="w-full">
              <FacebookIcon />
              Continuer avec Facebook
            </Button>
          </a>
        </div>

        <p className="mt-1 text-center text-[13px] text-gray-500">
          Pas encore de compte ?{' '}
          <Link href="/signup" className="font-medium text-brand">
            S&apos;inscrire gratuitement
          </Link>
        </p>
      </form>
    </AuthSplitLayout>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.092 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12.073C24 5.404 18.627 0 12 0C5.373 0 0 5.404 0 12.073C0 18.099 4.388 23.094 10.125 24V15.563H7.078V12.073H10.125V9.413C10.125 6.387 11.917 4.715 14.658 4.715C15.97 4.715 17.344 4.95 17.344 4.95V7.922H15.83C14.339 7.922 13.875 8.853 13.875 9.808V12.073H17.203L16.671 15.563H13.875V24C19.612 23.094 24 18.099 24 12.073Z"
      />
      <path
        fill="white"
        d="M16.671 15.563L17.203 12.073H13.875V9.808C13.875 8.853 14.339 7.922 15.83 7.922H17.344V4.95C17.344 4.95 15.97 4.715 14.658 4.715C11.917 4.715 10.125 6.387 10.125 9.413V12.073H7.078V15.563H10.125V24C10.736 24.097 11.363 24.146 12 24.146C12.637 24.146 13.264 24.097 13.875 24V15.563H16.671Z"
      />
    </svg>
  );
}
