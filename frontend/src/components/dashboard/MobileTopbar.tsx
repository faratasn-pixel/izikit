import Link from 'next/link';
import { Home, Bell } from 'lucide-react';
import type { User } from '@/contexts/AuthContext';
import { InitialsAvatar } from './InitialsAvatar';

const ROLE_LABEL: Record<string, string> = {
  OWNER_AGENT: 'Agent',
  TENANT_BUYER: 'Locataire / Acheteur',
};

export function MobileTopbar({ user, unreadCount }: { user: User; unreadCount: number }) {
  const roleLabel = ROLE_LABEL[user.accountType] ?? user.accountType;

  return (
    <div className="flex items-center justify-between border-b border-black/[0.06] bg-white px-4 py-3.5">
      <Link href="/dashboard" className="flex items-center gap-2">
        <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-md bg-brand">
          <Home className="h-[15px] w-[15px] text-white" aria-hidden />
        </div>
        <span className="font-sora text-[13px] font-semibold tracking-[0.3px] text-neutral-900">
          HABITAT-AFRIK
        </span>
      </Link>
      <div className="flex items-center gap-2.5">
        <div className="relative flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-lg bg-gray-50">
          <Bell className="h-[17px] w-[17px] text-neutral-700" aria-hidden />
          {unreadCount > 0 && (
            <span className="absolute top-[5px] right-[5px] h-2 w-2 rounded-full border-2 border-white bg-red-500" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <InitialsAvatar
            name={user.name}
            email={user.email}
            avatarUrl={user.avatarUrl}
            size={30}
          />
          <div className="flex flex-col gap-px">
            <span className="text-xs font-semibold whitespace-nowrap text-neutral-900">
              {user.name ?? user.email}
            </span>
            <span className="inline-block w-fit rounded-full bg-brand/10 px-1.5 py-px text-[9px] font-semibold whitespace-nowrap text-brand">
              {roleLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
