# Recipe Box

> Capture recipes from anywhere. Decide what to cook based on what you actually have on hand.

A personal recipe management web app — installable as a PWA on phones — for home cooks who collect recipes from many sources and want to reduce food waste and decision fatigue around "what's for dinner."

## Status

**M0 → M7 implemented and end-to-end verified.** All seven milestones from `docs/PRD.md` are wired up and working locally:

- M0 Foundations · Next.js 15 + TS + Tailwind + Drizzle + Auth.js + Postgres + design tokens + PWA scaffold
- M1 Capture text + URL + recipe detail with serving scaling
- M2 Photo capture (UI + upload + extraction pipeline)
- M3 Library polish (search, filters, sort, edit, soft-delete)
- M4 Pantry (CRUD with type-ahead, expiry-soon indicator, bulk-add)
- M5 Smart pantry search ★ — query parser + hybrid scorer with match%, missing, expiring annotations
- M6 Onboarding (3-step), Settings (units, export, delete), error/empty/loading states
- M7 PWA manifest + service worker (production only; auto-unregister in dev)

**Test coverage:** 28/28 Playwright E2E tests across desktop Chrome + mobile WebKit, 18/18 unit tests for parsing/scaling/scoring, `pnpm typecheck` and `pnpm build` both green.

## Quickstart

You'll need Node 20+, `pnpm`, and Docker (for local Postgres).

```sh
# 1. Install dependencies
pnpm install

# 2. Start local Postgres + pgvector (port 5433)
pnpm db:up

# 3. Copy env template and generate an auth secret
cp .env.example .env.local
# Edit .env.local — set AUTH_SECRET to: $(openssl rand -hex 32)

# 4. Apply migrations + seed canonical ingredients
pnpm db:migrate
pnpm db:seed

# 5. Start the dev server
pnpm dev
# → http://localhost:3000
```

Sign in by entering any email — local dev uses a credentials provider that creates a user on first sign-in.

## Optional credentials

Everything works locally without any external API keys. Add these to `.env.local` to swap in real services:

| Var | What it enables |
|---|---|
| `ANTHROPIC_API_KEY` | Real Claude calls for recipe extraction (URL/photo/text) and smart-search query parsing. Default uses a deterministic mock extractor. |
| `RESEND_API_KEY` + `EMAIL_FROM` | Magic-link sign-in email. Default uses a dev credentials provider that lets you sign in with any email locally. |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob for recipe photo storage. Default writes to `./public/uploads/` on the local filesystem. |

## Available scripts

```sh
pnpm dev              # Next.js dev server
pnpm build            # production build
pnpm start            # production server (after build)
pnpm typecheck        # tsc --noEmit
pnpm lint             # next lint

pnpm db:up            # docker compose up -d (Postgres on :5433)
pnpm db:down          # stop Postgres
pnpm db:psql          # interactive psql shell
pnpm db:generate      # drizzle-kit generate (after schema changes)
pnpm db:migrate       # apply migrations
pnpm db:seed          # seed ~334 canonical ingredients

pnpm test             # vitest run (unit tests)
pnpm test:watch       # vitest watch
pnpm test:e2e         # playwright test (desktop + mobile)
pnpm test:e2e:install # one-time: download Playwright browsers
```

## Documentation

- **[docs/PRD.md](./docs/PRD.md)** — product requirements: vision, target user, scope, flows, features, NFRs, data model, AI pipeline, milestones, open questions.
- **[docs/FILE-STRUCTURE.md](./docs/FILE-STRUCTURE.md)** — repo layout reference.
- **[design/](./design/)** — original design handoff (wireframes, design system, chat transcript). Read-only reference.

## Architecture summary

One service: **Vercel** for everything in production.

- **Next.js 15** (App Router) with React 19 — runs the web app
- **Auth.js v5 (NextAuth)** — JWT sessions; magic link via Resend in production, dev credentials provider locally
- **Postgres** with `pgvector` (Vercel Postgres / Neon in production; Docker pgvector image locally)
- **Drizzle ORM** — schema lives in `db/schema.ts`, migrations under `db/migrations/`
- **Vercel Blob** for recipe photos (filesystem fallback locally)
- **Anthropic Claude** via Vercel AI Gateway in production; deterministic mock extractor when `ANTHROPIC_API_KEY` is unset
- **Hand-rolled PWA** — `public/manifest.json` + `public/service-worker.js`; the SW only activates in production builds

The `lib/` directory is no-JSX domain logic (db queries, AI extraction, parsing, scoring). UI lives in `app/` and `components/`. API surface is in `app/api/.../route.ts` so a future Capacitor mobile shell can call the same endpoints over HTTP.

## What's next

Out of scope for v1, logged in `docs/PRD.md` §13: meal planning, grocery integration, social sharing, nutrition analysis, push notifications, native iOS/Android via Capacitor, voice capture.

Once you have real Anthropic + Resend keys, set them in `.env.local` and the capture/sign-in flows automatically switch from local mocks to production behavior — no code changes needed.

## Repo layout (after M0 scaffold)

```
recipe-book/
├── README.md                       this file
├── package.json
├── docker-compose.yml              local Postgres
├── drizzle.config.ts
├── next.config.ts
├── playwright.config.ts
├── tailwind.config.ts
├── vitest.config.ts
├── .env.example                    template (committed)
├── middleware.ts                   auth gate
│
├── app/                            App Router routes
│   ├── layout.tsx, globals.css
│   ├── page.tsx                    landing
│   ├── sign-in/, verify/           auth pages
│   ├── (app)/
│   │   ├── layout.tsx              top bar + bottom nav
│   │   ├── library/
│   │   ├── recipes/[id]/, /edit/
│   │   ├── capture/{url,text,photo,review/[jobId]}/
│   │   ├── pantry/
│   │   ├── cook/                   smart pantry search
│   │   ├── settings/
│   │   └── onboarding/{how,pantry}/
│   └── api/
│       ├── auth/[...nextauth]/
│       ├── capture/{url,text,photo}/
│       ├── recipes/, recipes/[id]/
│       ├── pantry/, ingredients/
│       ├── cook/search/
│       ├── blob/upload/
│       └── account/, account/export/
│
├── components/                     reusable UI (Logo, BottomNav)
├── lib/                            no-JSX domain logic
│   ├── auth/                       full + edge configs
│   ├── db/{client.ts, queries/}
│   ├── ai/extract.ts               capture pipelines
│   ├── parsing/{ingredients,scaling,schema-ld}.ts
│   ├── search/{parse-query,score}.ts
│   ├── blob/upload.ts
│   ├── validation/schemas.ts
│   └── env.ts
├── db/                             schema, migrations, seed
├── public/                         manifest, service-worker, icons
├── tests/
│   ├── unit/                       vitest — parsing, scaling, scoring
│   ├── e2e/full-flow.spec.ts       playwright — 14 tests × 2 projects
│   └── stubs/
├── docs/                           PRD + file structure
└── design/                         design handoff (read-only)
```
