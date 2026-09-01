'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, Mail, Eye, EyeOff, User, Building2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import { PhoneField } from '@/components/ui/PhoneField';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const DIAL_CODE = '+229';

const googleSignInHref = '/api/auth/oauth/google/start?next=/dashboard';
const facebookSignInHref = '/api/auth/oauth/facebook/start?next=/dashboard';

type AccountType = 'TENANT_BUYER' | 'OWNER_AGENT';

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'PASSWORD_BANNED':
        return 'Ce mot de passe est trop commun.';
      case 'PASSWORD_TOO_SHORT':
        return 'Mot de passe trop court (10 caractères minimum).';
      case 'PASSWORD_PWNED':
        return 'Ce mot de passe est apparu dans une fuite de données connue.';
      case 'TOO_MANY_SIGNUP_ATTEMPTS':
        return 'Trop de tentatives. Réessayez dans quelques instants.';
      default:
        return err.message;
    }
  }
  return 'Une erreur est survenue. Réessayez.';
}

export default function SignupPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [localNumber, setLocalNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>('TENANT_BUYER');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const phone = `${DIAL_CODE}${localNumber.replace(/[\s\-()]/g, '')}`;
      await api('/api/auth/signup', {
        method: 'POST',
        body: { firstName, lastName, email, phone, password, accountType },
      });
      // Signup never logs in directly — the account needs email verification.
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
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
          Rejoignez des <span className="text-brand">milliers</span> de propriétaires
        </>
      }
      heroSubtitle="Créez votre compte et accédez aux meilleures offres immobilières en Afrique."
      activeDot={1}
      topRight={
        <Link
          href="/login"
          className="flex items-center gap-1.5 rounded-[10px] border-[1.5px] border-black/[0.08] bg-white px-4.5 py-2 text-sm font-medium text-neutral-900"
        >
          <LogIn className="h-4 w-4 text-neutral-700" aria-hidden />
          Se connecter
        </Link>
      }
    >
      <div className="mb-7">
        <h2 className="font-sora mb-2 text-2xl leading-[1.2] font-semibold text-neutral-900 md:text-[30px]">
          Créez votre compte
          <br />
          <span className="text-brand">HABITAT-AFRIK</span>
        </h2>
        <p className="text-base text-gray-500">
          Gratuit et rapide — trouvez votre bien dès aujourd&apos;hui
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-[18px]">
        <div className="grid grid-cols-2 gap-3.5">
          <TextField
            label="Prénom"
            placeholder="Ex : Kofi"
            required
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <TextField
            label="Nom"
            placeholder="Ex : Mensah"
            required
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>

        <PhoneField
          label="Numéro de téléphone / WhatsApp"
          flag="🇧🇯"
          dialCode={DIAL_CODE}
          placeholder="67 00 00 00"
          required
          autoComplete="tel-national"
          value={localNumber}
          onChange={(e) => setLocalNumber(e.target.value)}
        />

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

        <TextField
          label="Mot de passe"
          type={showPassword ? 'text' : 'password'}
          placeholder="Au moins 10 caractères"
          required
          minLength={10}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-neutral-700">Vous êtes</span>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <RoleOption
              icon={<User className="h-4 w-4" aria-hidden />}
              label="Locataire / Acheteur"
              selected={accountType === 'TENANT_BUYER'}
              onSelect={() => setAccountType('TENANT_BUYER')}
            />
            <RoleOption
              icon={<Building2 className="h-4 w-4" aria-hidden />}
              label="Propriétaire / Agent"
              selected={accountType === 'OWNER_AGENT'}
              onSelect={() => setAccountType('OWNER_AGENT')}
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Création…' : "S'inscrire gratuitement"}
        </Button>

        <p className="text-center text-xs text-gray-400">
          En vous inscrivant, vous acceptez nos Conditions d&apos;utilisation et notre Politique de
          confidentialité.
        </p>

        <div className="my-1 flex items-center gap-3">
          <div className="h-px flex-1 bg-black/[0.08]" />
          <span className="text-[13px] whitespace-nowrap text-gray-400">Ou continuer avec</span>
          <div className="h-px flex-1 bg-black/[0.08]" />
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <a href={googleSignInHref} className="flex-1">
            <Button type="button" variant="social" className="w-full">
              <GoogleIcon />
              Google
            </Button>
          </a>
          <a href={facebookSignInHref} className="flex-1">
            <Button type="button" variant="social" className="w-full">
              <FacebookIcon />
              Facebook
            </Button>
          </a>
        </div>

        <p className="mt-1 text-center text-[13px] text-gray-500">
          Déjà un compte ?{' '}
          <Link href="/login" className="font-medium text-brand">
            Se connecter
          </Link>
        </p>
      </form>
    </AuthSplitLayout>
  );
}

function RoleOption({
  icon,
  label,
  selected,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex flex-1 items-center gap-2.5 rounded-[10px] border-[1.5px] bg-gray-50 px-3.5 py-2.5 text-left',
        selected ? 'border-brand bg-brand/[0.06]' : 'border-black/[0.08]',
      )}
    >
      <span
        className={cn(
          'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2',
          selected ? 'border-brand bg-brand' : 'border-black/[0.15]',
        )}
      >
        {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
      </span>
      <span className={cn('text-[13px] font-medium', selected ? 'text-brand' : 'text-gray-500')}>
        {icon}
      </span>
      <span className={cn('text-[13px] font-medium', selected ? 'text-brand' : 'text-neutral-900')}>
        {label}
      </span>
    </button>
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
