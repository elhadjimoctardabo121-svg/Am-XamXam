import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Reproduit le strict nécessaire de Supabase (rôles + schéma auth) au-dessus d'un
 * vrai PostgreSQL (PGlite) afin de tester les migrations et la RLS sans Docker.
 * auth.uid() est identique à celle de Supabase : elle lit request.jwt.claims.
 */
const BOOTSTRAP = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb not null default '{}'::jsonb
  );
  create function auth.uid() returns uuid language sql stable as $$
    select coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid
  $$;

  grant usage on schema public, auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
`;

const POST_MIGRATION = `
  grant all on all tables in schema public to service_role;
  grant all on all sequences in schema public to service_role;
  grant select on auth.users to service_role;
`;

export type Db = PGlite;

export async function createDb(): Promise<Db> {
  const db = new PGlite();
  await db.exec(BOOTSTRAP);
  const dir = join(process.cwd(), "supabase", "migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(dir, file), "utf8"));
  }
  await db.exec(POST_MIGRATION);
  return db;
}

/** Vide les données de test (en tant que superutilisateur), garde le référentiel. */
export async function resetData(db: Db) {
  await db.exec("reset role");
  await db.exec("truncate auth.users, public.audit_logs cascade");
}

/** Exécute fn avec le rôle et l'identité d'un utilisateur Supabase (null = anonyme). */
export async function as<T>(db: Db, userId: string | null, fn: () => Promise<T>): Promise<T> {
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [
    userId ? JSON.stringify({ sub: userId, role: "authenticated" }) : "",
  ]);
  await db.exec(`set role ${userId ? "authenticated" : "anon"}`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
    await db.query(`select set_config('request.jwt.claims', '', false)`);
  }
}

export const USERS = {
  student: "00000000-0000-4000-8000-000000000001",
  other: "00000000-0000-4000-8000-000000000002",
  editor: "00000000-0000-4000-8000-000000000003",
  admin: "00000000-0000-4000-8000-000000000004",
} as const;

export async function createUser(
  db: Db,
  id: string,
  meta: Record<string, unknown> = {},
  role?: "editor" | "admin",
) {
  await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [
    id,
    `${id}@test.local`,
    JSON.stringify(meta),
  ]);
  if (role) await db.query(`update public.profiles set role = $2 where id = $1`, [id, role]);
}

export async function classId(db: Db, code: "3eme" | "terminale") {
  const r = await db.query<{ id: string }>(`select id from public.classes where code = $1`, [code]);
  return r.rows[0].id;
}

export async function subjectId(db: Db, code = "histoire") {
  const r = await db.query<{ id: string }>(`select id from public.subjects where code = $1`, [code]);
  return r.rows[0].id;
}

/** Insère un chapitre côté serveur (sans utilisateur) : reviewed_by est alors obligatoire si publié. */
export async function insertChapter(
  db: Db,
  opts: { slug: string; class: "3eme" | "terminale"; status?: string; tier?: string; reviewedBy?: string | null },
) {
  const r = await db.query<{ id: string }>(
    `insert into public.chapters (class_id, subject_id, slug, title, status, access_tier, reviewed_by)
     values ($1, $2, $3, $4, $5, $6, $7) returning id`,
    [
      await classId(db, opts.class),
      await subjectId(db),
      opts.slug,
      `Chapitre ${opts.slug}`,
      opts.status ?? "published",
      opts.tier ?? "free",
      opts.reviewedBy === undefined ? USERS.admin : opts.reviewedBy,
    ],
  );
  return r.rows[0].id;
}

export async function insertLesson(
  db: Db,
  chapterId: string,
  opts: { level?: number; status?: string; tier?: string } = {},
) {
  const r = await db.query<{ id: string }>(
    `insert into public.lessons (chapter_id, level, title, body_md, status, access_tier, reviewed_by)
     values ($1, $2, 'Leçon', 'Contenu de la leçon', $3, $4, $5) returning id`,
    [chapterId, opts.level ?? 1, opts.status ?? "published", opts.tier ?? "free", USERS.admin],
  );
  return r.rows[0].id;
}
