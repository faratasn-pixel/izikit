'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Clock, ShieldCheck, Bell, ArrowRight } from 'lucide-react';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import { ResetStepIndicator } from '@/components/auth/ResetStepIndicator';
import { Button } from '@/components/ui/Button';

export default function ResetPasswordSuccessPage() {
  const router = useRouter();
  const [resetAt, setResetAt] = useState<string | null>(null);

  useEffect(() => {
    setResetAt(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
  }, []);

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
    >
      <div className="flex flex-col items-center text-center">
        <ResetStepIndicator activeStep={3} />

        <div className="mb-9 flex h-[120px] w-[120px] items-center justify-center rounded-full bg-brand/[0.08]">
          <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-brand/[0.14]">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand">
              <Check className="h-8 w-8 text-white" aria-hidden />
            </div>
          </div>
        </div>

        <h2 className="font-sora mb-3 text-2xl leading-[1.2] font-semibold text-neutral-900 md:text-[32px]">
          Mot de passe <span className="text-brand">réinitialisé !</span>
        </h2>
        <p className="mb-9 max-w-sm text-base text-gray-500">
          Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant vous connecter à
          votre compte HABITAT-AFRIK.
        </p>

        <div className="mb-9 flex w-full max-w-sm flex-col gap-3.5 rounded-xl bg-gray-50 px-5 py-5 text-left">
          <p className="text-[13px] font-semibold text-neutral-900">Informations de sécurité</p>

          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-brand/10">
              <Clock className="h-4 w-4 text-brand" aria-hidden />
            </div>
            <p className="text-[13px] leading-snug text-gray-500">
              <strong className="font-medium text-neutral-700">Réinitialisé le</strong> —
              Aujourd&apos;hui à {resetAt ?? '…'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-brand/10">
              <ShieldCheck className="h-4 w-4 text-brand" aria-hidden />
            </div>
            <p className="text-[13px] leading-snug text-gray-500">
              <strong className="font-medium text-neutral-700">Toutes vos sessions</strong> ont été
              déconnectées pour votre sécurité.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-brand/10">
              <Bell className="h-4 w-4 text-brand" aria-hidden />
            </div>
            <p className="text-[13px] leading-snug text-gray-500">
              Un <strong className="font-medium text-neutral-700">email de confirmation</strong>{' '}
              vous a été envoyé.
            </p>
          </div>
        </div>

        <Button type="button" className="mb-4" onClick={() => router.push('/login')}>
          Se connecter maintenant
          <ArrowRight className="h-[18px] w-[18px]" aria-hidden />
        </Button>

        <p className="text-[13px] text-gray-500">
          Besoin d&apos;aide ?{' '}
          <Link href="/login" className="font-medium text-brand">
            Contacter le support
          </Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
}
