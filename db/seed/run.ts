import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { ingredients } from './../schema';

function loadEnvLocal() {
  const p = '.env.local';
  if (!existsSync(p)) return;
  const txt = readFileSync(p, 'utf8');
  for (const line of txt.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

type Catalog = Record<string, string[]>;

async function main() {
  loadEnvLocal();
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

  const json = readFileSync(path.join(process.cwd(), 'db/seed/ingredients.json'), 'utf8');
  const catalog = JSON.parse(json) as Catalog;

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  let total = 0;
  let inserted = 0;
  for (const [category, names] of Object.entries(catalog)) {
    for (const name of names) {
      const lower = name.toLowerCase().trim();
      total += 1;
      const result = await db
        .insert(ingredients)
        .values({ name: lower, category: category as never, aliases: [] })
        .onConflictDoNothing({ target: ingredients.name })
        .returning({ id: ingredients.id });
      if (result.length) inserted += 1;
    }
  }

  console.log(`Seed: ${inserted} new ingredients (${total} considered).`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
