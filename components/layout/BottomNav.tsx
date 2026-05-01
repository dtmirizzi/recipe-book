'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/library', label: 'Library', icon: '📚' },
  { href: '/cook', label: 'Cook', icon: '🍳' },
  { href: '/capture', label: 'Capture', icon: '＋' },
  { href: '/pantry', label: 'Pantry', icon: '🥕' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="bottomnav sm:hidden" aria-label="Primary">
      {items.map((it) => {
        const active = pathname?.startsWith(it.href) ?? false;
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? 'page' : undefined}
          >
            <span className="glyph-icon" aria-hidden>
              {it.icon}
            </span>
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
