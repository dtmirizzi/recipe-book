'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Member = {
  userId: string;
  role: 'owner' | 'member';
  joinedAt: Date;
  name: string | null;
  email: string;
  image: string | null;
};

type FeedItem = {
  id: string;
  title: string;
  description: string | null;
  cuisine: string | null;
  totalMinutes: number | null;
  baseServings: number;
  coverImageUrl: string | null;
  authorId: string;
  authorName: string | null;
  authorEmail: string;
  starCount: number;
  createdAt: Date;
};

export function RoundtableDetailClient({
  roundtable,
  feed,
  viewerId,
}: {
  roundtable: {
    id: string;
    name: string;
    inviteCode: string;
    role: 'owner' | 'member';
    members: Member[];
  };
  feed: FeedItem[];
  viewerId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const inviteUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/roundtables/join/${roundtable.inviteCode}`
      : `/roundtables/join/${roundtable.inviteCode}`;

  async function copyInvite() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function leave() {
    if (!confirm('Leave this roundtable? Your recipes will stop being shared with members.')) return;
    setBusy(true);
    const res = await fetch(`/api/roundtables/${roundtable.id}`, { method: 'DELETE' });
    if (res.ok) router.push('/roundtables');
    else setBusy(false);
  }

  return (
    <>
      <section className="card mt-4">
        <div className="t-eyebrow">Invite link</div>
        <div className="flex gap-2 mt-2">
          <input className="input flex-1" readOnly value={inviteUrl} />
          <button type="button" className="btn" onClick={copyInvite}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className="t-meta mt-2">Anyone with this link can join. Reusable.</p>
      </section>

      <section className="mt-6">
        <h2 className="t-h2 mb-3">Members ({roundtable.members.length})</h2>
        <ul className="flex flex-col gap-2">
          {roundtable.members.map((m) => (
            <li
              key={m.userId}
              className="flex items-center gap-3"
              style={{ borderBottom: '1px solid var(--line)', paddingBottom: 8 }}
            >
              <div
                className="rounded-full flex items-center justify-center"
                style={{ width: 32, height: 32, background: 'var(--paper-soft)', fontFamily: 'var(--font-serif)' }}
                aria-hidden
              >
                {(m.name ?? m.email)[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <div>{m.name ?? m.email.split('@')[0]}</div>
                <div className="t-meta">
                  {m.email} · {m.role}
                </div>
              </div>
            </li>
          ))}
        </ul>
        <button type="button" className="btn mt-4" onClick={leave} disabled={busy}>
          Leave roundtable
        </button>
      </section>

      <section className="mt-8">
        <h2 className="t-h2 mb-3">Shared recipes ({feed.length})</h2>
        {feed.length === 0 ? (
          <p className="t-meta">Nothing here yet — when members add recipes they'll appear here.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {feed.map((r) => (
              <Link
                key={r.id}
                href={`/recipes/${r.id}`}
                className="block card hover:shadow-md transition-shadow"
                style={{ padding: 0, overflow: 'hidden' }}
              >
                {r.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.coverImageUrl} alt="" loading="lazy" style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ width: '100%', height: 140, background: 'var(--paper-soft)' }} />
                )}
                <div style={{ padding: 12 }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: 1.2 }}>{r.title}</div>
                  <div className="t-meta mt-1">
                    {r.authorId === viewerId
                      ? 'you'
                      : `by ${r.authorName ?? r.authorEmail.split('@')[0]}`}
                    {r.totalMinutes ? ` · ${r.totalMinutes} min` : ''}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
