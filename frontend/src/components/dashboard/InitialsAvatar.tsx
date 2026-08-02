import { cn } from '@/lib/utils';

function initialsFrom(name: string | null, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && name) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

// Deterministic brand-adjacent hue from the source string so the same user
// always gets the same avatar color, without needing a real photo upload
// feature (none exists yet — `User.avatarUrl` is currently only ever
// populated by OAuth sign-in).
function hueFrom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return hash % 360;
}

export function InitialsAvatar({
  name,
  email,
  avatarUrl,
  size = 34,
  className,
}: {
  name: string | null;
  email: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name ?? email}
        className={cn('flex-shrink-0 rounded-full object-cover', className)}
        style={{ width: size, height: size }}
      />
    );
  }
  const hue = hueFrom(email);
  return (
    <div
      className={cn(
        'flex flex-shrink-0 items-center justify-center rounded-full font-semibold text-white',
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        background: `hsl(${hue} 70% 45%)`,
      }}
      aria-hidden
    >
      {initialsFrom(name, email)}
    </div>
  );
}
