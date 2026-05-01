# Recipe Box — Product Requirements Document

**Status:** v1 draft, pre-implementation
**Last updated:** 2026-05-01
**Owner:** dtmirizzi

---

## 1. Overview

Recipe Box is a personal recipe management web app — installable as a PWA on phones — that lets home cooks capture recipes from anywhere, then decide what to cook based on what's actually in the pantry. The headline feature is **smart pantry search**: a natural-language query against your saved recipes, ranked by ingredient fit and weighted toward ingredients that are about to expire.

It is intentionally personal. No social graph, no marketplace, no nutrition database. The product feels like a well-organized recipe box, not a database — warm, uncluttered, low-friction.

---

## 2. Target user & jobs-to-be-done

**User:** A home cook who collects recipes from many sources (websites, screenshots, printed cards, family handwritten notes), is non-technical, mobile-first, and is motivated by two everyday frustrations:

1. Recipes are scattered. Bookmarks, screenshots in the camera roll, photos of cookbook pages, magazine clippings, "what was that thing my mom made?"
2. Decision fatigue at 5pm. The fridge has things in it. Some are about to go bad. What can I make *right now*?

**Jobs-to-be-done:**

- *When I find a recipe anywhere, help me save it without typing it out.*
- *When I'm staring at the fridge, help me decide what to cook tonight.*
- *When I have leftovers I don't want to waste, help me use them up.*
- *When I want to cook for more or fewer people, help me scale the recipe without doing math.*

**Non-users (explicitly out of audience):** Professional chefs (need way more structure), meal-planners-by-spreadsheet (different product), social-cooking communities (out of scope for v1), nutrition-tracking diet users (out of scope for v1).

---

## 3. v1 success metrics

These are the bars we're targeting. They drive scope decisions.

| Metric | Target | Why |
|---|---|---|
| Time to first saved recipe (new user) | < 90 sec from sign-in | Onboarding friction kills personal-organization apps. |
| Capture success rate (URL → structured) | ≥ 90% on top-50 cooking sites | If parsing fails frequently, the product feels broken. |
| Capture success rate (photo → structured) | ≥ 80% on legible printed/typed recipes; best-effort on handwritten | Photo capture is the differentiator from "yet another bookmark folder." |
| Smart-pantry-search relevance | ≥ 80% of returned top-3 results are reasonable matches per the user's pantry | Headline feature; if it's mediocre, the app has no story. |
| Mobile Lighthouse score | ≥ 90 perf, ≥ 95 a11y | We're shipping a PWA; this is table stakes. |
| 7-day retention (cohort of 20 friends-and-family beta users) | ≥ 50% return at least once in week 1 | Sanity check before broader release. |

---

## 4. Scope

### In scope (v1)

- Email-based authentication (Auth.js with magic-link email)
- Recipe capture from three sources: URL, photo upload, pasted text
- LLM-driven structured extraction (title, ingredients with quantities, steps, prep/cook time, servings, cuisine, dietary tags)
- Review/edit of parsed recipe before save
- Recipe library: list, search, filter (cuisine, meal type, time, tags)
- Recipe detail view with serving scaling
- Pantry: list of ingredients the user has on hand, with optional expiry dates
- Smart pantry search: natural-language query → ranked recipe results, with "missing" and "expiring soon" annotations
- PWA: installable on iOS/Android home screen, responsive, basic offline (read your saved recipes when offline)
- Settings: profile, account deletion, data export (JSON download)

### Out of scope (v1) — explicitly deferred

- Meal planning calendar / weekly planner
- Grocery list generation, grocery delivery integrations
- Social sharing, public recipe URLs, following other users
- Nutritional analysis / calorie counting
- Photo capture *via* the device camera natively (we accept uploads; native camera comes with the optional Capacitor wrapper later)
- Push notifications (no notification server in v1)
- Native app store distribution (PWA only — Capacitor/App Store is a v2 consideration)
- Multi-language support (English only)
- Recipe versioning / edit history
- Print-to-PDF export of an individual recipe (data export is JSON only)
- Multi-user / family-shared pantries

---

## 5. User flows

Each flow is described as a numbered walkthrough — what the user does, what the app does in response. These are written to be specific enough that a coding agent can wire screens to API calls.

### 5.1 First-run / onboarding

1. User lands on `/` unauthenticated. Marketing-light page: hero ("Tonight, something warm."), three feature tiles (capture, library, smart search), one CTA: **Sign in**.
2. Click sign-in → `/auth/sign-in`. Email field + "Send link" button.
3. User enters email, hits Send → server emits magic link via Auth.js + Resend (or equivalent).
4. User clicks link in email → returns authenticated, lands on `/onboarding`.
5. Onboarding is **3 lightweight steps**, all skippable:
   - **Step 1 — How it works.** 3 illustrated cards. "Save anything." / "Your library." / "What's for dinner?"
   - **Step 2 — Seed your pantry.** Pre-curated checklist of ~40 common pantry items grouped (Produce / Proteins / Grains / Dairy / Condiments). Tap to add. "Skip — I'll add later."
   - **Step 3 — Add your first recipe.** Three doors: Paste URL / Upload Photo / Paste Text. "Skip — I'll explore first."
6. Land on `/library` (empty state if no recipes yet).

### 5.2 Capture — URL

1. User on `/capture` (or via FAB on `/library`), picks **URL**.
2. Pastes a URL into a single text field. Hits **Fetch**.
3. App posts URL to `/api/capture/url`. Server: fetches the page, runs a recipe-schema extractor (`schema.org/Recipe` first, fall back to LLM extraction on the cleaned HTML).
4. While the request is pending: skeleton placeholder shows on `/capture/review`.
5. Server returns a structured recipe draft. User lands on `/capture/review` with all fields editable.
6. User reviews/edits. Hits **Save**. Server persists, returns recipe ID.
7. Redirect to `/recipes/[id]`.

### 5.3 Capture — Photo

1. User on `/capture`, picks **Photo**.
2. File picker (or `<input capture>` on mobile) → user selects/snaps an image. Image previewed inline.
3. User hits **Extract**.
4. Image is uploaded directly to Vercel Blob (signed URL flow); blob URL posted to `/api/capture/photo`.
5. Server: runs OCR (Anthropic Claude with vision — single multimodal call: "read this recipe image, return structured JSON"). For low-confidence regions (handwritten), Claude flags them in the response.
6. Same review/edit/save flow as §5.2, with low-confidence fields visually marked for the user to double-check.

### 5.4 Capture — Text

1. User on `/capture`, picks **Text**.
2. Large textarea. User pastes raw text (e.g., from a screenshot they typed out, or from a chat message).
3. **Extract** → `/api/capture/text` → LLM structures it. Same review/save flow.

### 5.5 Library browse

1. User on `/library`. Default view: card grid, sorted by `addedAt desc`.
2. Top of page: search input ("Search 87 recipes…"), filter chips (Cuisine / Meal type / Time / Tags), sort menu.
3. Search is full-text on title + ingredient names + tags. Debounced; results update live.
4. Each card: thumbnail (or placeholder), title (Fraunces), 1-line meta ("30 min · 4 servings"), 1–2 chips.
5. Tapping a card → `/recipes/[id]`.
6. Empty state ("No recipes yet — add your first one") and zero-result state ("No matches. Try clearing filters?") both implemented.

### 5.6 Recipe detail

1. `/recipes/[id]` shows the full recipe.
2. Top: title (Fraunces), meta line, dietary chips, "added on …".
3. Ingredients section, then Steps section. Mobile: stacked. Desktop: side-by-side.
4. **Servings scaler**: pill at the top of Ingredients. `– 4 +`. Tapping changes the displayed quantities. Quantity scaling is computed client-side from the canonical "base" servings stored on the recipe.
5. Action row: Edit · Delete · Export.
6. "Back to library" stays in the layout.

### 5.7 Pantry management

1. User on `/pantry`. Shows current pantry as a tag cloud (chips), grouped by category. Each chip has the ingredient name and, if present, a small expiry indicator (color band on the chip — saffron when ≤ 3 days from expiry).
2. **Add an ingredient**: input at the top with type-ahead from a canonical ingredient list (~1500 common ingredients seeded; new entries are accepted). Optional expiry date.
3. **Remove**: tap chip → contextual actions (Remove / Set expiry).
4. **Bulk add**: opens the same pre-curated checklist from onboarding.
5. Pantry edits are immediate (optimistic UI, debounced PATCH).

### 5.8 Smart pantry search ★

This is the headline. It deserves the most-detailed flow.

1. User on `/cook` (or via prominent CTA on `/library` or `/pantry`).
2. Top of page: a single text input with placeholder "What can I make…?" and a quick-fill row of suggested chips ("Quick weeknight dinner" / "Use what's about to expire" / "Vegetarian, under 30 min" / "Cooks in one pan").
3. User types a free-form query and hits Enter.
4. Request goes to `/api/cook/search` with `{ query, pantryIds }`.
5. Server pipeline (described in §10 below):
   - Parse the query into structured constraints (time, dietary, mood, explicit ingredient mentions) using an LLM with structured output.
   - Generate an embedding of the parsed query.
   - Vector-search over the user's recipes (each recipe has a precomputed embedding combining title + ingredient names + cuisine + tags).
   - Score each candidate by: ingredient overlap with the pantry, missing-ingredient count, soon-to-expire bonus, time/dietary constraint match, embedding similarity.
   - Return top N (default 12) with per-result metadata: `matchPct`, `missingIngredients[]`, `usesExpiringIngredients[]`.
6. Results render as a **swipe-able stack** on mobile (one big card at a time, swipe left to dismiss / swipe right to plan it; tap to open detail) and a 3-column grid on desktop.
7. Each card prominently surfaces:
   - Title (Fraunces)
   - "96% match" pill (tomato accent if ≥ 80%)
   - "Uses lemons ⚠ (3 days)" annotation when an expiring ingredient is featured (saffron pill)
   - "Need: butter, parsley" — small muted line below
   - Time, dietary chips
8. Empty state: "No close matches. Try widening your pantry, or clear constraints."

### 5.9 Settings & data

1. `/settings`: name, email (read-only — Auth.js owns it), preferred units (US / Metric), delete account, export data (JSON).
2. Delete account: 2-step confirmation, server cascades the user's recipes, pantry, and stored images.
3. Export: streams a JSON file with all recipes and pantry items.

---

## 6. Functional requirements

### 6.1 Authentication

- **Provider:** Auth.js (NextAuth) with the **Email** provider (magic link), no passwords in v1.
- **Email transport:** Resend (free tier covers v1 volume).
- **Session storage:** database sessions in Postgres via `@auth/drizzle-adapter`.
- **Protected routes:** all `/app/*` routes require an authenticated session. Middleware redirects unauthenticated requests to `/auth/sign-in`.
- **No social logins in v1** — adding Google later is one config block, but it's deferred to keep the auth surface minimal.

### 6.2 Recipe capture

- **Three entry points:** URL, photo, pasted text. All converge on a common review screen.
- **Parser hierarchy for URL:**
  1. Try `schema.org/Recipe` JSON-LD first (works on most major cooking sites — fast and free).
  2. If absent or malformed, run readability cleanup on the HTML, then send the cleaned text to an LLM (Claude Haiku) for structured extraction.
- **Photo extraction:** single multimodal Claude call. The image is sent inline (after resize to ≤ 2048px max edge to keep tokens bounded). Returned JSON includes per-field `confidence` so we can highlight low-confidence fields in the review UI.
- **Text extraction:** plain text → Claude Haiku structured output. Same JSON shape as URL/photo.
- **Common output schema** (Zod-validated server-side):
  - `title: string`
  - `description?: string`
  - `servings: number` (canonical "as written"; scaling is derived)
  - `prepMinutes?: number`
  - `cookMinutes?: number`
  - `totalMinutes?: number` (computed; never user-input)
  - `cuisine?: string` (free text but normalized server-side against a known list)
  - `mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert' | 'side' | 'sauce'`
  - `dietaryTags: string[]` (vegetarian, vegan, gluten-free, dairy-free, nut-free, etc.)
  - `ingredients: { rawText: string, name: string, quantity?: number, unit?: string, note?: string }[]`
  - `steps: { ordinal: number, body: string }[]`
  - `sourceUrl?: string`
  - `sourcePhotoBlobUrl?: string`
- **Review screen** must allow editing every field, adding/removing ingredients and steps, and reordering steps (drag handles on desktop, up/down arrows on mobile).

### 6.3 Recipe library

- List view: card grid, lazy-loaded with `react-window` or simple pagination at 24 per page.
- Search: full-text on `title`, `ingredients.name`, `dietaryTags`, `cuisine`. Implemented with Postgres `tsvector` GIN index.
- Filter chips: Cuisine, Meal type, Time bucket (≤ 15 / ≤ 30 / ≤ 60 / > 60 min), Dietary tags. Multi-select within a category.
- Sort: Recently added (default), A–Z, Quickest first.

### 6.4 Recipe detail

- Servings scaler stored as recipe `baseServings` (immutable). Display servings is a client-side multiplier. Quantities are scaled on display only — never persisted at the new scale.
- "Edit" goes to a full-screen edit form mirroring the review screen.
- "Delete" is a 2-tap confirm; soft-delete in DB (kept 30 days for accidental-restore-on-request, hard-deleted by a cron job).

### 6.5 Pantry

- Pantry items are linked to a canonical `ingredient` row (seeded with ~1500 common ingredients, free-form additions allowed).
- Each pantry item: `userId`, `ingredientId`, `addedAt`, `expiresAt?` (date, optional).
- "Soon-to-expire" rule: `expiresAt` is within 3 days of today.
- No quantity tracking on pantry items in v1 (the chat decision was "just a tag list of ingredients"). User flag: "I have it" / "I don't have it." Future versions can add quantity.

### 6.6 Smart pantry search

See §10 for the algorithm. The user-facing requirements:

- Returns within 3 seconds at the 95th percentile for a library of ≤ 500 recipes.
- Always returns *something* — even if no recipe is a strong match, return the closest 3 with clear "missing 4 ingredients" framing rather than empty state.
- Annotations on every card: `matchPct` (0–100), `missingIngredients[]`, `usesExpiringIngredients[]`, `secondsToCook` (if known).
- Query is logged (for offline relevance review) but never used to train an external model. Logged with user ID; users can clear their query history from Settings.

### 6.7 Settings

- Edit display name. Email is read-only and tied to auth.
- Unit preference: US (cups/tbsp) or Metric (g/ml). Affects ingredient display only — canonical storage is whatever was parsed; we convert at render time using a small unit-conversion table.
- Delete account (cascading). Export data (JSON download).

---

## 7. Non-functional requirements

### 7.1 Mobile-first PWA

- **Responsive breakpoints:** mobile (≤ 640px), tablet (≤ 1024px), desktop (> 1024px). Mobile is the primary design target — every screen must be designed mobile-first and progressively enhanced for larger viewports.
- **PWA manifest:** name, short_name, start_url, display: standalone, theme_color = `--tomato-500`, background_color = `--paper-warm`, full icon set (192, 512, maskable).
- **Service worker:** caches the app shell + the user's last 50 recipes for offline read. Writes (saving a recipe, editing pantry) require network — fail with a clear offline banner. Use Workbox or hand-rolled; don't pull in `next-pwa` unless we need it.
- **Installable on iOS Safari (Add to Home Screen) and Android Chrome.**
- **No splash-screen plugin** — the standalone display mode + background_color is enough for v1.

### 7.2 Performance

- Mobile Lighthouse perf ≥ 90, a11y ≥ 95, best-practices ≥ 95.
- LCP < 2.0s on a 4G profile against `/library` with 50 recipes.
- API p95 latency: capture endpoints ≤ 8s (LLM-bound); all others ≤ 500ms.
- Cold start of a Vercel function ≤ 800ms (Fluid compute / edge where possible).

### 7.3 Accessibility

- WCAG 2.1 AA.
- Color contrast: every ink-on-paper combination in `design-system.css` meets ≥ 4.5:1 for body text, ≥ 3:1 for large text. (Validated; the tomato primary on white is 5.7:1.)
- Keyboard navigation: every interactive control reachable in a logical tab order.
- Focus-visible rings on all interactive elements (already in `design-system.css`).
- ARIA labels on icon-only buttons. Heading hierarchy preserved. Form labels associated.
- Reduced-motion respected: any swipe-stack animations should have a `prefers-reduced-motion` fallback.

### 7.4 Offline behavior

- Read-only offline access to the user's last 50 viewed recipes (cached by the service worker).
- Pantry view: cached snapshot, with a banner "you are offline — pantry edits will retry when reconnected" (queued mutations, retry on reconnect — `idb-keyval` for the queue).
- Smart search: not available offline (LLM-bound). Show a friendly "you're offline; smart search needs the network" empty state.

### 7.5 Privacy & data

- All user data is private to that user. No public recipes, no shared pantries in v1.
- Minimum data collected: email (auth), display name (optional), recipes the user adds, pantry items the user adds, query history.
- LLM calls (capture, smart search) send only the necessary user content. No marketing identifiers attached. Do not allow Anthropic to use submissions for training (set the appropriate API headers).
- Account deletion is permanent and cascades all user-owned rows + Vercel Blob assets within 24h.
- Cookies: only the auth session cookie. No analytics or marketing cookies in v1. (Vercel Analytics is server-side and acceptable.)

### 7.6 Security

- Auth.js secrets and database URL in Vercel env vars; never committed.
- All DB writes go through server-side route handlers with the authed `userId` from the session. No client-supplied `userId`.
- Row-level enforcement at the query layer (every query is `WHERE user_id = ?` — Drizzle helper). No raw client SQL.
- File uploads: signed URL flow to Vercel Blob, content-type whitelist (`image/jpeg`, `image/png`, `image/webp`, `image/heic`), max 10 MB, virus scanning is *not* in v1 scope.
- Rate limits on all capture endpoints (Vercel KV-backed): 30 captures/hour per user.
- HTTPS-only.

---

## 8. Tech architecture

### 8.1 One-service stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | RSC, server actions, route handlers, edge runtime where useful. |
| Hosting | Vercel | One vendor, integrated everything below. |
| Auth | Auth.js (NextAuth) v5 + Email provider (Resend) | No extra vendor; sessions in our own DB. |
| Database | Vercel Postgres (Neon-backed) with `pgvector` | Postgres for everything; vector for smart search. |
| ORM | Drizzle | Lightweight, fast cold starts, SQL-first, ergonomic with Vercel Postgres. |
| File storage | Vercel Blob | Recipe photos. Signed-URL upload flow. |
| Cache / rate limit | Vercel KV (Upstash Redis) | Capture rate limits, smart-search query cache. |
| LLM | Anthropic Claude via Vercel AI Gateway | Gateway for observability + provider failover; AI SDK for ergonomics. Haiku for capture, Sonnet for smart search query parsing. |
| Durable workflows | Vercel Workflow | Photo capture pipeline (upload → OCR → extract → save) survives slow LLM calls and crashes. |
| Email | Resend | Single API, generous free tier, magic links. |
| PWA | Hand-rolled `manifest.json` + service worker | No `next-pwa` unless the rolled-our-own version gets gnarly. |

### 8.2 Why not Supabase / Clerk / others

- **Supabase:** great product, but we're not using its auth, realtime, or auto-API. Vercel Postgres + Drizzle is simpler for our use.
- **Clerk:** great auth UX, but it's an extra vendor we don't need given Auth.js + Resend covers magic-link sign-in.
- **Prisma:** Drizzle has better Vercel cold-start characteristics and a SQL-first feel that fits the team.
- **next-pwa:** can be a bag of legacy assumptions; rolling a tiny service worker is ~50 LOC and ours.

### 8.3 Local development

- `pnpm install`
- `vercel link` + `vercel env pull .env.local` (or run a local Postgres + dummy env vars; both supported)
- `pnpm dev` → Next.js dev server on `localhost:3000`. PWA features (manifest, service worker) load on the same port.
- Optional: `vercel dev` if you want to mirror the production runtime (Fluid compute, AI Gateway). Either works for most flows.
- Tests: Vitest for units, Playwright for one or two end-to-end smoke tests of capture and smart-search.

---

## 9. Data model

A first cut. Open to revision once the implementation begins.

```text
users                         (Auth.js standard table, plus our extensions)
 ├─ id (uuid, pk)
 ├─ email (text, unique)
 ├─ name (text)
 ├─ unit_preference ('us' | 'metric', default 'us')
 ├─ created_at, updated_at, deleted_at

accounts, sessions, verification_tokens   (Auth.js standard — managed by adapter)

recipes
 ├─ id (uuid, pk)
 ├─ user_id (fk users.id, on delete cascade)
 ├─ title (text)
 ├─ description (text, nullable)
 ├─ base_servings (int)
 ├─ prep_minutes (int, nullable)
 ├─ cook_minutes (int, nullable)
 ├─ total_minutes (int, generated)
 ├─ cuisine (text, nullable, normalized)
 ├─ meal_type (enum, nullable)
 ├─ dietary_tags (text[])
 ├─ source_url (text, nullable)
 ├─ source_photo_blob_url (text, nullable)
 ├─ source_text (text, nullable)
 ├─ embedding (vector(1536), nullable)       -- pgvector, computed at save
 ├─ search_tsv (tsvector, generated)         -- GIN index for full-text
 ├─ created_at, updated_at, deleted_at

recipe_ingredients
 ├─ id (uuid, pk)
 ├─ recipe_id (fk recipes.id, on delete cascade)
 ├─ ingredient_id (fk ingredients.id, nullable)  -- null if free-form
 ├─ ordinal (int)
 ├─ raw_text (text)                              -- "1 1/2 cups whole milk, divided"
 ├─ name (text)                                  -- "whole milk"
 ├─ quantity (numeric, nullable)
 ├─ unit (text, nullable)                        -- "cup", "tbsp", "g"
 ├─ note (text, nullable)                        -- "divided"

recipe_steps
 ├─ id (uuid, pk)
 ├─ recipe_id (fk)
 ├─ ordinal (int)
 ├─ body (text)

ingredients                  (canonical, seeded ~1500 + user-added)
 ├─ id (uuid, pk)
 ├─ name (text, unique, lowercased)
 ├─ category (enum: produce / protein / grain / dairy / pantry / spice / condiment / beverage / other)
 ├─ aliases (text[])         -- "scallion" ↔ "green onion"
 ├─ embedding (vector(1536)) -- precomputed; used for fuzzy ingredient matching

pantry_items
 ├─ id (uuid, pk)
 ├─ user_id (fk)
 ├─ ingredient_id (fk)
 ├─ added_at (timestamp)
 ├─ expires_at (date, nullable)
 ├─ unique (user_id, ingredient_id)            -- one row per user+ingredient

cook_queries                 (search history)
 ├─ id (uuid, pk)
 ├─ user_id (fk)
 ├─ query (text)
 ├─ parsed (jsonb)            -- structured constraints
 ├─ result_recipe_ids (uuid[])
 ├─ created_at

capture_jobs                 (durable workflow state)
 ├─ id (uuid, pk)
 ├─ user_id (fk)
 ├─ kind ('url' | 'photo' | 'text')
 ├─ status ('queued' | 'processing' | 'review' | 'saved' | 'failed')
 ├─ input (jsonb)
 ├─ output (jsonb, nullable)   -- the structured draft
 ├─ error (text, nullable)
 ├─ created_at, updated_at
```

**Indexes:**
- `recipes(user_id, created_at desc)` for library listing
- `recipes USING gin(search_tsv)` for full-text
- `recipes USING ivfflat(embedding vector_cosine_ops)` for vector search
- `recipe_ingredients(recipe_id)`, `recipe_ingredients(ingredient_id)` for the smart-search join
- `pantry_items(user_id)`, `pantry_items(expires_at)` for "soon-to-expire" queries
- `ingredients(name)`, `ingredients USING ivfflat(embedding ...)`

---

## 10. AI / parsing pipeline architecture

### 10.1 Capture pipelines

All three (URL, photo, text) converge on the same internal `extractRecipe(input)` function which returns the same Zod-validated `RecipeDraft` shape.

**URL pipeline** (cheap, deterministic when possible):
1. `fetch(url)` server-side with a 10s timeout, follow redirects, set a real User-Agent.
2. Parse HTML with `linkedom`. Look for `<script type="application/ld+json">` containing `"@type": "Recipe"`. If present, map fields directly.
3. If absent/malformed: run `@mozilla/readability` to clean, then send the cleaned text + URL to **Claude Haiku** with a `tool_use` schema matching `RecipeDraft`. Validate with Zod.
4. If both fail, surface a clear error to the user with the option to fall through to manual entry.

**Photo pipeline** (most expensive, longest latency — wrapped in a Workflow):
1. Client uploads image directly to Vercel Blob via signed URL.
2. POST to `/api/capture/photo` with `{ blobUrl }` → starts a Vercel Workflow.
3. Workflow steps:
   - Download the blob server-side (Vercel-internal fetch, low latency).
   - Resize to max-edge 2048px to bound input tokens.
   - Send the image + a structured-extraction prompt to **Claude Sonnet (vision)**. Sonnet > Haiku here because handwritten and low-light photos benefit from the better visual reasoning.
   - Validate the response with Zod. On `confidence < 0.6` for a field, mark it for the review UI.
   - Persist a `capture_jobs` row at `status = 'review'` so the client can poll or subscribe.
4. The review screen reads from `capture_jobs.output`.

**Text pipeline** (cheapest):
1. POST to `/api/capture/text` with `{ text }`.
2. Single Claude Haiku call with structured output. Validate. Return.

### 10.2 Smart pantry search pipeline

This is the headline feature, so it gets its own subsystem.

**Inputs:** the user's free-form query, the user's current pantry, the user's recipe library.

**Steps:**

1. **Parse the query → structured constraints.** One Claude Haiku call with a tool-use schema:
   ```ts
   {
     mood?: string,                          // "weeknight", "comforting", "fresh"
     timeMaxMinutes?: number,                // "quick" → 30, "fast" → 20, etc.
     dietaryRequired?: string[],             // ["vegetarian"]
     dietaryAvoid?: string[],                // ["nuts"]
     mustUseIngredients?: string[],          // user-mentioned ingredient names
     prioritizeExpiring?: boolean            // "use what's about to go bad"
   }
   ```
   This is fast (Haiku, structured output, ~600ms p50).
2. **Generate query embedding.** A single embedding call on a synthetic query string built from the parsed constraints + the original text. Embedding model: Voyage AI's `voyage-3-large` via the AI Gateway, or whatever the gateway recommends — settle this at implementation time.
3. **Candidate retrieval (vector + filters).** Single SQL query: top-50 user recipes by cosine similarity to the query embedding, filtered by `dietaryRequired`/`dietaryAvoid` and `total_minutes <= timeMaxMinutes` if present.
4. **Re-rank by ingredient fit.** For each candidate, compute:
   - `overlapCount` = ingredients in the recipe that have a fuzzy match (canonical or alias or embedding-similarity-above-threshold) to a pantry item
   - `missingCount` = ingredients with no match
   - `expiringBonus` = +1 per ingredient that the pantry has marked as expiring soon
   - `mustUseBonus` = large bonus if a `mustUseIngredients` query item is present
   - `score = w1·overlap − w2·missing + w3·expiringBonus + w4·mustUseBonus + w5·embeddingSim`
   - Tunable weights. Initial guess: `w1=2, w2=1, w3=3, w4=5, w5=1`.
5. **Return top 12** with the per-recipe metadata listed in §6.6.
6. **Cache** the parsed query (Vercel KV, 5-min TTL keyed by `userId:queryHash`) so re-running the same query is instant.

This is intentionally a hybrid: vector retrieval for semantic recall ("comforting" → soup recipes), then a deterministic ingredient-overlap scorer for the part the user actually evaluates ("does it use what I have?"). Vector-only would feel magical-but-wrong; ingredient-overlap-only would miss the "weeknight" / "comforting" mood inputs.

### 10.3 Embedding lifecycle

- On recipe save: compute one embedding from the concatenation `title + cuisine + tags + ingredient names`. Store on `recipes.embedding`.
- On ingredient create: compute one embedding for the canonical ingredient `name`. Store on `ingredients.embedding`. Used for fuzzy matching of pantry items to recipe ingredients.
- Re-embed on title/ingredient/tag edits. (Workflow step on save.)

### 10.4 Cost ceilings (rough)

For a single user with ~100 recipes, ~30 pantry items, ~10 captures/month, ~30 smart searches/month:

| Cost driver | Rough monthly count | Notes |
|---|---|---|
| Capture (URL, schema-LD path) | ~7 | $0 in LLM (deterministic). |
| Capture (URL, fallback LLM) | ~2 | Haiku, ~$0.001 each. |
| Capture (photo, Sonnet vision) | ~1 | ~$0.02 each. |
| Smart-search query parsing (Haiku) | ~30 | ~$0.001 each. |
| Embeddings (recipe saves + searches) | ~40 | ~$0.0001 each. |
| **Per-user LLM cost** | | **< $0.10 / month / user.** |

Vercel Postgres + Blob + Functions for a small beta cohort fits comfortably in the free tier.

---

## 11. Open questions / decisions needed

These need a call from you before or during implementation.

1. **Email transport.** Resend is my default. Confirm, or pick alternative (Postmark, SendGrid, AWS SES).
2. **Visual identity.** The handoff specifies Lato + Fraunces + JetBrains Mono with a tomato accent. Confirmed?
3. **Brand name.** "Recipe Box" in the design, "recipe-book" in the GitHub repo. Which is canonical for the product? (I've been writing "Recipe Box.")
4. **Beta access.** Any auth gate beyond email magic link for v1? (E.g., invite-only allowlist.)
5. **Image storage region.** Vercel Blob is regional. Default to US-East unless you have a strong reason.
6. **Analytics.** Vercel Analytics (server-side, GDPR-friendly) for v1, or no analytics at all? My default: yes, on. Easy to turn off.
7. **Error reporting.** Sentry or just `console.error` + Vercel logs in v1? I'd defer Sentry to v1.1.
8. **Photo OCR fallback.** If a single Claude Sonnet call fails on a hard image, do we (a) just show the user the failure with a "type it manually" CTA, or (b) try a second pass with explicit OCR (Tesseract / a vision API) before LLM extraction? My recommendation: (a) for v1; revisit if the success rate is below 80%.
9. **Capacitor / App Store later.** Confirmed deferred to v2?
10. **Multi-device sessions.** Magic-link sessions are 30 days. Allow concurrent sessions on multiple devices? Default yes; confirm.
11. **Profanity / illegal-content filter on captured text.** Probably unnecessary for a personal recipe app, but: confirm we skip it.

---

## 12. Milestones / build order

Each milestone is a coherent, demoable slice. The order minimizes throwaway work — we build the foundations once and add features on top.

**M0 — Foundations** (1–2 days)
- Repo scaffolded: Next.js 15 + TS + Tailwind + Drizzle + Auth.js + Vercel Postgres + AI SDK
- Design tokens (`design-system.css`) wired as the global stylesheet
- Empty PWA manifest and service worker
- One protected page (`/library`) and a sign-in flow
- Vercel deploy live, env vars set
- CI: type-check, lint, tests on push

**M1 — Capture: text + URL** (2–3 days)
- `/capture` with three doors; text and URL working end-to-end
- Review screen, save flow, redirect to detail
- Schema-LD parser and LLM fallback
- Recipe detail page (read-only) with serving scaling
- Library list (no search yet)

**M2 — Capture: photo** (2–3 days)
- Vercel Blob signed-URL upload
- Vercel Workflow for the OCR pipeline
- Confidence-flagged review fields
- iOS file-picker + camera-capture verified

**M3 — Library polish** (2 days)
- Full-text search (`tsvector`)
- Filter chips, sort menu
- Empty/loading/error states
- Edit and delete flows

**M4 — Pantry** (2 days)
- Pantry list view (chips by category)
- Add/remove with type-ahead
- Expiry dates
- Bulk-add from curated checklist
- Onboarding step 2 wired up

**M5 — Smart pantry search ★** (3–5 days, the headline)
- Embeddings on recipe save (backfill existing rows)
- Query-parsing LLM call
- Hybrid retrieval + scorer
- Mobile swipe stack + desktop grid
- Per-card metadata (match%, missing, expiring)
- Suggested-query chips

**M6 — Onboarding + Settings + Polish** (2 days)
- 3-step onboarding flow
- Settings page
- Data export
- Account deletion
- Empty/error/offline states reviewed across the app
- Lighthouse pass (perf, a11y)

**M7 — PWA + Beta** (1–2 days)
- Service-worker offline cache for app shell + last 50 recipes
- Install prompts
- Offline banner / queued mutations
- Beta invite to ~20 friends/family

**Total v1 estimate:** ~3 working weeks, single developer, no major rework.

---

## 13. Appendix: out-of-scope ideas worth not forgetting

These are recurring "wouldn't it be cool if…" thoughts. Logged here so they don't clutter v1, but kept in case a v1.1 or v2 lookback finds them valuable.

- **Recipe collections / cookbooks** — group recipes into named collections.
- **"Cook mode"** — fullscreen step-by-step view, screen-on, big text, voice navigation ("next").
- **Smart pantry replenishment** — auto-suggest groceries based on usage trends.
- **Recipe versioning** — keep history of edits.
- **Family-shared pantries** — multi-user pantry, single recipe library.
- **Native iOS/Android via Capacitor** — App Store presence, native share sheet ("share to Recipe Box" from any browser/photo app).
- **Push notifications** — "your basil is about to expire."
- **Public recipe URLs** — read-only share links.
- **Import from Paprika / Mealie / Notion / Apple Notes / Whisk.**
- **Voice capture** — "hey Recipe Box, save this from yesterday's chat with mom."

---

*End of PRD. Open issues and revisions tracked in `docs/CHANGELOG.md` once implementation starts.*
