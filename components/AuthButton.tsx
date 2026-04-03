'use client';
import { useSession, signIn, signOut } from 'next-auth/react';
import Image from 'next/image';

export default function AuthButton() {
  const { data: session } = useSession();

  if (session?.user) {
    return (
      <div className="flex items-center gap-3">
        {session.user.image && (
          <Image
            src={session.user.image}
            alt={session.user.name ?? 'User'}
            width={24}
            height={24}
            className="rounded-full"
          />
        )}
        <span className="font-ui text-xs text-[#6b6b6b] hidden sm:block">
          {session.user.name}
        </span>
        <button
          onClick={() => signOut()}
          className="font-ui text-xs text-[#6b6b6b] hover:text-[#121212] underline underline-offset-2 transition-colors"
        >
          Log Out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn('google')}
      className="font-ui text-xs font-semibold text-[#121212] hover:text-[#d0021b] underline underline-offset-2 transition-colors tracking-wide uppercase"
    >
      Log In
    </button>
  );
}
