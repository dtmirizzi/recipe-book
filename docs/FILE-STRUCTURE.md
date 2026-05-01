# Recipe Box — File Structure

This is the **target** layout once the Next.js app is scaffolded. Today the repo only contains `docs/` and `design/`. M0 scaffolds the rest.

## Top level

```
recipe-book/
├── README.md                       Project intro, links to PRD + FS, quickstart
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── drizzle.config.ts
├── vercel.json                     Vercel build/runtime config
├── .env.example                    Env var template (committed)
├── .env.local                      Real local env vars (gitignored)
├── .gitignore
├── .nvmrc                          Node version pin
├── .github/
│   └── workflows/
│       ├── ci.yml                  type-check + lint + test on PR
│       └── deploy-preview.yml      (Vercel handles deploys; this is for any extras)
│
├── design/                         Read-only — design handoff bundle (do not edit)
│   ├── HANDOFF-README.md           Original "coding agents read this" handoff doc
│   ├── design-chat-transcript.md   The user/designer chat that produced these designs
│   ├── wireframes/
│   │   └── wireframes.html         Print-flat wireframes for all screens (open in browser)
│   └── design-system/
│       ├── design-system.html      Interactive design system reference page
│       ├── design-system-print.html Print version
│       └── design-system.css       Source of truth for tokens — copied into app/globals.css
│
├── docs/
│   ├── PRD.md                      Product requirements document
│   ├── FILE-STRUCTURE.md           This file
│   ├── DECISIONS.md                ADRs — small log of "we chose X because Y"
│   └── CHANGELOG.md                Implementation milestones + dated notes
│
├── app/                            Next.js App Router routes
├── components/                     Reusable UI components
├── lib/                            Domain logic (no JSX) — db, auth, ai, search, blob
├── db/                             Drizzle schema, migrations, seed data
├── public/                         Static assets — manifest, icons, service worker
└── tests/                          Vitest units + Playwright e2e
```

## `app/` — App Router

Next.js 15 App Router. File-system routing, server components by default. Convention: `page.tsx` for the route, `layout.tsx` for nested layouts, `route.ts` for API endpoints, `loading.tsx` for streaming skeletons, `error.tsx` for boundary, `not-found.tsx` for 404s. Co-locate route-only components in a `_components/` folder per route segment (the underscore opts the folder out of routing).

```
app/
├── layout.tsx                      Root layout — fonts, theme, <html lang>, viewport
├── globals.css                     Imports design tokens + base resets (from design-system.css)
├── page.tsx                        Public marketing-light landing (signed-out)
├── loading.tsx                     Top-level streaming skeleton
├── error.tsx                       Top-level error boundary
├── not-found.tsx
│
├── (auth)/                         Auth surface — signed-out routes, no app chrome
│   ├── layout.tsx                  Centered auth layout
│   ├── sign-in/page.tsx            Email magic-link form
│   ├── verify/page.tsx             "check your email" + 6-digit fallback
│   └── error/page.tsx              Auth error page
│
├── (app)/                          Authenticated app — middleware-enforced
│   ├── layout.tsx                  App chrome: top bar, bottom nav (mobile), side nav (desktop)
│   ├── onboarding/
│   │   ├── page.tsx                3-step onboarding shell
│   │   ├── step-1/page.tsx         How it works
│   │   ├── step-2/page.tsx         Seed pantry
│   │   └── step-3/page.tsx         Add first recipe
│   │
│   ├── library/
│   │   ├── page.tsx                Card grid — search + filters
│   │   ├── loading.tsx
│   │   └── _components/
│   │       ├── recipe-card.tsx
│   │       ├── filter-bar.tsx
│   │       └── empty-state.tsx
│   │
│   ├── recipes/
│   │   └── [id]/
│   │       ├── page.tsx            Recipe detail
│   │       ├── edit/page.tsx       Full edit screen (mirrors capture review)
│   │       └── _components/
│   │           ├── servings-scaler.tsx
│   │           ├── ingredient-list.tsx
│   │           └── step-list.tsx
│   │
│   ├── capture/
│   │   ├── page.tsx                Three doors: URL / Photo / Text
│   │   ├── url/page.tsx
│   │   ├── photo/page.tsx
│   │   ├── text/page.tsx
│   │   ├── review/[jobId]/page.tsx Editable parsed-recipe review
│   │   └── _components/
│   │       ├── url-form.tsx
│   │       ├── photo-uploader.tsx
│   │       ├── text-form.tsx
│   │       └── review-form.tsx
│   │
│   ├── pantry/
│   │   ├── page.tsx                Tag-cloud view + bulk-add
│   │   └── _components/
│   │       ├── pantry-chip.tsx
│   │       ├── add-input.tsx
│   │       └── bulk-add-sheet.tsx
│   │
│   ├── cook/                       Smart pantry search (★)
│   │   ├── page.tsx                Query input + suggested chips + results
│   │   └── _components/
│   │       ├── query-input.tsx
│   │       ├── suggestion-chips.tsx
│   │       ├── result-stack.tsx    Mobile swipe stack
│   │       ├── result-grid.tsx     Desktop grid
│   │       └── match-card.tsx      Result card with match%, missing, expiring
│   │
│   └── settings/
│       ├── page.tsx                Profile + units + delete + export
│       └── _components/
│           ├── delete-account.tsx
│           └── export-button.tsx
│
└── api/                            Route handlers (REST-ish)
    ├── auth/[...nextauth]/route.ts Auth.js handler
    ├── capture/
    │   ├── url/route.ts            POST { url }
    │   ├── photo/route.ts          POST { blobUrl } — kicks off Workflow
    │   ├── text/route.ts           POST { text }
    │   └── job/[id]/route.ts       GET — poll a capture job's status
    ├── recipes/
    │   ├── route.ts                GET (list, search, filter), POST (save draft)
    │   └── [id]/
    │       ├── route.ts            GET, PATCH, DELETE
    │       └── embedding/route.ts  POST — recompute (admin/dev only)
    ├── pantry/
    │   ├── route.ts                GET, POST
    │   └── [id]/route.ts           PATCH, DELETE
    ├── ingredients/
    │   └── route.ts                GET — type-ahead search
    ├── cook/
    │   └── search/route.ts         POST { query } — smart-search pipeline
    ├── blob/
    │   └── upload-url/route.ts     POST — issues a signed Vercel Blob upload URL
    └── account/
        ├── route.ts                DELETE — cascade delete user
        └── export/route.ts         GET — JSON download
```

### Conventions inside `app/`

- **Server components by default.** Only mark `'use client'` on components that need interactivity (forms with local state, swipe gestures, drag handles).
- **Server actions** live next to the route segment they belong to, in an `actions.ts` file. Prefer route handlers (`/app/api/.../route.ts`) for endpoints that the future Capacitor mobile shell would need to call directly — server actions don't expose a stable HTTP endpoint.
- **Loading and error boundaries are mandatory** for every route segment that does data fetching.
- **`_components/` folders are route-private.** Anything reusable across multiple routes lives in `/components`.

## `components/` — Reusable UI

Component primitives that aren't tied to a specific route. Names match the design system.

```
components/
├── primitives/
│   ├── Button.tsx                  .btn / .btn-primary / .btn-ghost
│   ├── Chip.tsx                    .chip / .chip-accent / .chip-fill
│   ├── Input.tsx                   .input
│   ├── Card.tsx                    .card
│   ├── EyebrowLabel.tsx            .t-eyebrow
│   └── Logo.tsx                    Glyph + wordmark, sizes 16/24/32/44
├── layout/
│   ├── TopBar.tsx                  Branded header (signed-in)
│   ├── BottomNav.tsx               Mobile bottom nav: Library / Cook / Pantry / Capture (FAB)
│   ├── SideNav.tsx                 Desktop side nav
│   └── Container.tsx               .container
├── feedback/
│   ├── EmptyState.tsx
│   ├── OfflineBanner.tsx
│   └── Skeleton.tsx
└── forms/
    ├── IngredientRow.tsx           One row in the review/edit form
    ├── StepRow.tsx
    └── DragHandle.tsx
```

## `lib/` — Domain logic (no JSX)

Plain TypeScript modules. These are imported by route handlers, server components, and server actions. **No React in here.**

```
lib/
├── auth/
│   ├── config.ts                   NextAuth options (providers, adapter, callbacks)
│   ├── session.ts                  getServerSession() helper
│   └── middleware.ts               Auth middleware factory for protected routes
├── db/
│   ├── client.ts                   Drizzle client (singleton, pooled)
│   ├── helpers.ts                  scoped() — auto-applies WHERE user_id
│   └── queries/
│       ├── recipes.ts
│       ├── pantry.ts
│       ├── ingredients.ts
│       └── cook.ts                 Smart-search retrieval + scoring
├── ai/
│   ├── client.ts                   AI Gateway client; model picker
│   ├── prompts/
│   │   ├── extract-recipe.ts       Capture extraction prompt + Zod schema
│   │   ├── parse-cook-query.ts     Smart-search query → constraints
│   │   └── shared.ts
│   ├── extract.ts                  extractRecipe(input) — unified entry
│   ├── workflows/
│   │   └── photo-capture.ts        Vercel Workflow definition
│   └── embeddings.ts               embed(text) helper
├── parsing/
│   ├── schema-ld.ts                schema.org/Recipe extractor
│   ├── readability.ts              HTML → clean text
│   ├── ingredients.ts              "1 1/2 cups whole milk, divided" → structured
│   ├── units.ts                    Unit conversion (US ↔ metric)
│   └── scaling.ts                  Servings scaler (display-time only)
├── search/
│   ├── score.ts                    score(recipe, pantry, parsedQuery) → number + meta
│   └── rank.ts                     Re-ranker
├── blob/
│   └── upload.ts                   Signed-URL flow + image resize
├── validation/
│   └── schemas.ts                  Zod schemas (RecipeDraft, PantryItem, CookQuery)
├── errors.ts                       Typed app errors
├── env.ts                          Validated env vars (zod)
└── logger.ts                       Thin wrapper over console + Vercel logs
```

## `db/` — Drizzle

```
db/
├── schema.ts                       All tables — single file
├── relations.ts                    Drizzle relations (separate from schema for clarity)
├── migrations/                     Generated by `drizzle-kit generate`
│   ├── 0000_init.sql
│   └── meta/_journal.json
└── seed/
    ├── ingredients.ts              ~1500 canonical ingredients (script that inserts)
    └── ingredients.json            The data
```

## `public/` — Static assets

```
public/
├── manifest.json                   PWA manifest
├── service-worker.js               Hand-rolled SW (cache app shell + last 50 recipes)
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-maskable-192.png
│   ├── icon-maskable-512.png
│   ├── apple-touch-icon.png
│   └── favicon.ico
└── og-image.png                    Open Graph card
```

## `tests/`

```
tests/
├── unit/
│   ├── parsing/
│   │   ├── ingredients.test.ts
│   │   ├── units.test.ts
│   │   └── scaling.test.ts
│   ├── search/
│   │   └── score.test.ts
│   └── ai/
│       └── extract.test.ts         Stubbed LLM responses
└── e2e/
    ├── capture-text.spec.ts        Playwright — paste text, save, see in library
    └── cook-search.spec.ts         Playwright — seed pantry, search, see ranked results
```

## File-naming conventions

- **kebab-case** for filenames (`recipe-card.tsx`, `cook-query.ts`).
- **PascalCase** for component exports (`RecipeCard`, `CookQuery`).
- **camelCase** for non-component exports.
- **`page.tsx`, `layout.tsx`, `route.ts`** are reserved by Next.js conventions.
- Co-locate component-specific styles inside the component file (Tailwind classes + occasional `style={{...}}`). Do not introduce CSS modules.
- One default export per file, except utility modules with multiple named exports.

## Where the design tokens live

- Source of truth: `design/design-system/design-system.css` (read-only — the design handoff).
- Working copy: `app/globals.css` imports the tokens at build time. We don't `@import` the file at runtime; we copy the `:root { --… }` block directly so the build stays simple. When tokens change in the design system, we re-copy.
- Tailwind config maps the tokens to theme keys: `colors.tomato.500`, `colors.paper`, `fontFamily.serif: 'var(--font-serif)'`, etc. So `<div class="bg-tomato-500 text-paper">` works.

## What's *not* in this layout (and why)

- **No `pages/` directory.** App Router only.
- **No `src/` wrapper.** Flat `/app`, `/components`, `/lib` reads better; Next.js supports both.
- **No Storybook in v1.** Component count is small; the design system page is the storybook.
- **No `next-pwa` package.** Hand-rolled service worker is simpler and ours.
- **No Prisma schema.** Drizzle owns the schema in `db/schema.ts`.
- **No GraphQL layer.** Route handlers are the API contract; consumed today by Next.js itself, tomorrow by a Capacitor mobile shell.
