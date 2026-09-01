import { type ReactNode } from 'react';
import Link from 'next/link';
import { Home } from 'lucide-react';

interface AuthSplitLayoutProps {
  heroImageSrc: string;
  heroImageAlt: string;
  heroTitle: ReactNode;
  heroSubtitle: string;
  /** Which of the 3 pagination dots is active (0-indexed). */
  activeDot?: number;
  /** Rendered top-right of the form column, e.g. a "Sign up" link. */
  topRight?: ReactNode;
  children: ReactNode;
}

/**
 * Reusable split-screen shell for the Banani "HABITATAFRIK EQUIPE" auth flow
 * (login, signup, forgot/reset password, …). Left hero panel is decorative
 * and hidden below `md:` — there's no room for it on a 375px viewport and
 * the design has no mobile spec for it.
 */
export function AuthSplitLayout({
  heroImageSrc,
  heroImageAlt,
  heroTitle,
  heroSubtitle,
  activeDot = 0,
  topRight,
  children,
}: AuthSplitLayoutProps) {
  return (
    <div className="flex min-h-screen w-full md:min-h-[812px]">
      {/* Left hero panel — desktop/tablet only */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden p-9 pb-10 md:flex">
        <img
          src={heroImageSrc}
          alt={heroImageAlt}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#081223]/88 via-[#081223]/38 to-[#081223]/10" />

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-[38px] w-[38px] items-center justify-center rounded-md bg-brand">
              <Home className="h-5 w-5 text-white" aria-hidden />
            </div>
            <span className="font-sora text-lg font-semibold tracking-[0.3px] text-white">
              HABITAT-AFRIK
            </span>
          </Link>
        </div>

        <div className="relative z-10">
          <h1 className="font-sora mb-3.5 max-w-[440px] text-5xl leading-[1.2] font-semibold text-white">
            {heroTitle}
          </h1>
          <p className="mb-7 max-w-[380px] text-lg leading-normal text-white/80">{heroSubtitle}</p>
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={
                  i === activeDot
                    ? 'h-2 w-6 rounded-full bg-brand'
                    : 'h-2 w-2 rounded-full bg-white/35'
                }
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex w-full flex-col overflow-y-auto md:w-1/2">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-8 md:max-w-none md:px-[60px] md:py-9">
          {topRight && <div className="mb-8 flex justify-end md:mb-12">{topRight}</div>}
          {children}
        </div>
      </div>
    </div>
  );
}
