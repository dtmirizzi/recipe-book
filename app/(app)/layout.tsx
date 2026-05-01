import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { requireUser } from '@/lib/auth/session';
import { signOut } from '@/lib/auth/config';
import { BottomNav } from '@/components/layout/BottomNav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen flex flex-col" style={{ paddingBottom: 72 }}>
      <header className="topbar">
        <div className="container-rb inner">
          <Link href="/library" className="contents">
            <Logo size={32} />
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            <NavLink href="/library">Library</NavLink>
            <NavLink href="/cook">Cook</NavLink>
            <NavLink href="/pantry">Pantry</NavLink>
            <NavLink href="/capture" emphasize>
              + Capture
            </NavLink>
            <form
              action={async () => {
                'use server';
                await signOut({ redirectTo: '/' });
              }}
            >
              <button type="submit" className="btn btn-ghost ml-2" aria-label="Sign out">
                Sign out
              </button>
            </form>
          </nav>
          <div className="sm:hidden t-meta truncate max-w-[40%]">{user.email}</div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <BottomNav />
    </div>
  );
}

function NavLink({ href, children, emphasize = false }: { href: string; children: React.ReactNode; emphasize?: boolean }) {
  return (
    <Link href={href} className={emphasize ? 'btn btn-primary' : 'btn btn-ghost'}>
      {children}
    </Link>
  );
}
