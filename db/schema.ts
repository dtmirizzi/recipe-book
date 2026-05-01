import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// ─── Auth.js standard tables ──────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name'),
  email: text('email').unique().notNull(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  unitPreference: text('unit_preference').$type<'us' | 'metric'>().default('us').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => ({
    pk: primaryKey({ columns: [account.provider, account.providerAccountId] }),
  }),
);

export const sessions = pgTable('sessions', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: uuid('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable(
  'verificationToken',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (vt) => ({ pk: primaryKey({ columns: [vt.identifier, vt.token] }) }),
);

// ─── Domain enums ─────────────────────────────────────────────────────────

export const mealTypeEnum = pgEnum('meal_type', [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
  'dessert',
  'side',
  'sauce',
]);

export const ingredientCategoryEnum = pgEnum('ingredient_category', [
  'produce',
  'protein',
  'grain',
  'dairy',
  'pantry',
  'spice',
  'condiment',
  'beverage',
  'other',
]);

export const captureKindEnum = pgEnum('capture_kind', ['url', 'photo', 'text']);
export const mediaKindEnum = pgEnum('media_kind', ['image', 'video', 'embed']);
export const mediaProviderEnum = pgEnum('media_provider', ['youtube', 'vimeo']);
export const visibilityEnum = pgEnum('recipe_visibility', ['private', 'public']);
export const roundtableRoleEnum = pgEnum('roundtable_role', ['owner', 'member']);
export const captureStatusEnum = pgEnum('capture_status', [
  'queued',
  'processing',
  'review',
  'saved',
  'failed',
]);

// ─── Domain tables ────────────────────────────────────────────────────────

export const ingredients = pgTable(
  'ingredients',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').unique().notNull(), // lowercased
    category: ingredientCategoryEnum('category').notNull().default('other'),
    aliases: text('aliases').array().notNull().default(sql`'{}'::text[]`),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    nameIdx: index('ingredients_name_idx').on(t.name),
  }),
);

export const recipes = pgTable(
  'recipes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    baseServings: integer('base_servings').notNull().default(4),
    prepMinutes: integer('prep_minutes'),
    cookMinutes: integer('cook_minutes'),
    totalMinutes: integer('total_minutes'),
    cuisine: text('cuisine'),
    mealType: mealTypeEnum('meal_type'),
    dietaryTags: text('dietary_tags').array().notNull().default(sql`'{}'::text[]`),
    sourceUrl: text('source_url'),
    sourcePhotoUrl: text('source_photo_url'),
    sourceText: text('source_text'),
    coverImageUrl: text('cover_image_url'),
    visibility: visibilityEnum('visibility').notNull().default('private'),
    // Embedding stored as numeric[]; on real Postgres+pgvector this can be a vector(1536).
    // We keep it as a JSON-encoded number array for portability with the local stack.
    embedding: jsonb('embedding').$type<number[] | null>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (t) => ({
    userCreatedIdx: index('recipes_user_created_idx').on(t.userId, t.createdAt),
    titleIdx: index('recipes_title_idx').on(t.title),
    visibilityIdx: index('recipes_visibility_idx').on(t.visibility),
  }),
);

export const recipeStars = pgTable(
  'recipe_stars',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    recipeId: uuid('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.recipeId] }),
    recipeIdx: index('recipe_stars_recipe_idx').on(t.recipeId),
    userIdx: index('recipe_stars_user_idx').on(t.userId, t.createdAt),
  }),
);

export const roundtables = pgTable(
  'roundtables',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    inviteCode: text('invite_code').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    ownerIdx: index('roundtables_owner_idx').on(t.ownerId),
  }),
);

export const roundtableMembers = pgTable(
  'roundtable_members',
  {
    roundtableId: uuid('roundtable_id')
      .notNull()
      .references(() => roundtables.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: roundtableRoleEnum('role').notNull().default('member'),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.roundtableId, t.userId] }),
    userIdx: index('roundtable_members_user_idx').on(t.userId),
  }),
);

export const recipeIngredients = pgTable(
  'recipe_ingredients',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    recipeId: uuid('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    ingredientId: uuid('ingredient_id').references(() => ingredients.id, {
      onDelete: 'set null',
    }),
    ordinal: integer('ordinal').notNull().default(0),
    rawText: text('raw_text').notNull(),
    name: text('name').notNull(),
    quantity: numeric('quantity', { precision: 10, scale: 3 }),
    unit: text('unit'),
    note: text('note'),
  },
  (t) => ({
    recipeIdx: index('recipe_ingredients_recipe_idx').on(t.recipeId),
    ingredientIdx: index('recipe_ingredients_ingredient_idx').on(t.ingredientId),
  }),
);

export const recipeSteps = pgTable(
  'recipe_steps',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    recipeId: uuid('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    ordinal: integer('ordinal').notNull(),
    body: text('body').notNull(),
  },
  (t) => ({
    recipeIdx: index('recipe_steps_recipe_idx').on(t.recipeId),
  }),
);

export const recipeMedia = pgTable(
  'recipe_media',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    recipeId: uuid('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    stepId: uuid('step_id').references(() => recipeSteps.id, { onDelete: 'set null' }),
    kind: mediaKindEnum('kind').notNull(),
    url: text('url').notNull(),
    posterUrl: text('poster_url'),
    caption: text('caption'),
    ordinal: integer('ordinal').notNull().default(0),
    mimeType: text('mime_type'),
    sizeBytes: integer('size_bytes'),
    width: integer('width'),
    height: integer('height'),
    durationSeconds: numeric('duration_seconds', { precision: 8, scale: 2 }),
    provider: mediaProviderEnum('provider'),
    embedId: text('embed_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    recipeIdx: index('recipe_media_recipe_idx').on(t.recipeId, t.ordinal),
    stepIdx: index('recipe_media_step_idx').on(t.stepId),
  }),
);

export const pantryItems = pgTable(
  'pantry_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ingredientId: uuid('ingredient_id')
      .notNull()
      .references(() => ingredients.id, { onDelete: 'cascade' }),
    addedAt: timestamp('added_at').defaultNow().notNull(),
    expiresAt: date('expires_at'),
  },
  (t) => ({
    uniqueUserIngredient: uniqueIndex('pantry_user_ingredient_unique').on(
      t.userId,
      t.ingredientId,
    ),
    userIdx: index('pantry_user_idx').on(t.userId),
    expiresIdx: index('pantry_expires_idx').on(t.expiresAt),
  }),
);

export const cookQueries = pgTable(
  'cook_queries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    query: text('query').notNull(),
    parsed: jsonb('parsed').$type<Record<string, unknown>>(),
    resultRecipeIds: uuid('result_recipe_ids').array(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index('cook_queries_user_idx').on(t.userId, t.createdAt),
  }),
);

export const captureJobs = pgTable(
  'capture_jobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: captureKindEnum('kind').notNull(),
    status: captureStatusEnum('status').notNull().default('queued'),
    input: jsonb('input').$type<Record<string, unknown>>().notNull(),
    output: jsonb('output').$type<Record<string, unknown> | null>(),
    error: text('error'),
    onboarding: boolean('onboarding').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index('capture_jobs_user_idx').on(t.userId, t.createdAt),
  }),
);

// ─── Inferred types for convenience ───────────────────────────────────────

export type User = typeof users.$inferSelect;
export type Recipe = typeof recipes.$inferSelect;
export type RecipeInsert = typeof recipes.$inferInsert;
export type RecipeIngredient = typeof recipeIngredients.$inferSelect;
export type RecipeStep = typeof recipeSteps.$inferSelect;
export type Ingredient = typeof ingredients.$inferSelect;
export type PantryItem = typeof pantryItems.$inferSelect;
export type CaptureJob = typeof captureJobs.$inferSelect;
export type RecipeMedia = typeof recipeMedia.$inferSelect;
export type RecipeMediaInsert = typeof recipeMedia.$inferInsert;
export type Roundtable = typeof roundtables.$inferSelect;
export type RoundtableMember = typeof roundtableMembers.$inferSelect;
export type RecipeStar = typeof recipeStars.$inferSelect;
