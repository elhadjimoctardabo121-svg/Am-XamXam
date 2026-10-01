import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  USERS,
  as,
  classId,
  createDb,
  createUser,
  insertChapter,
  insertLesson,
  resetData,
  subjectId,
  type Db,
} from "./harness";

let db: Db;

beforeAll(async () => {
  db = await createDb();
}, 60_000);

afterAll(async () => {
  await db.close();
});

beforeEach(async () => {
  await resetData(db);
  await createUser(db, USERS.admin, { display_name: "Admin" }, "admin");
  await createUser(db, USERS.editor, { display_name: "Éditeur" }, "editor");
  await createUser(db, USERS.student, { display_name: "Awa" });
  await createUser(db, USERS.other, { display_name: "Modou" });
});

const rows = async <T extends object = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
  (await db.query<T>(sql, params)).rows;

describe("structure", () => {
  it("active la RLS sur toutes les tables du schéma public", async () => {
    const r = await rows(
      `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
    );
    expect(r).toEqual([]);
  });

  it("n'accorde à anon aucun droit d'écriture sur le schéma public", async () => {
    const r = await rows(
      `select table_name, privilege_type from information_schema.role_table_grants
       where grantee = 'anon' and table_schema = 'public'
         and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE')`,
    );
    expect(r).toEqual([]);
  });

  it("contient les classes et matières de lancement", async () => {
    const classes = await rows<{ code: string }>(`select code from public.classes order by position`);
    expect(classes.map((x) => x.code)).toEqual(["3eme", "terminale"]);
    const subjects = await rows<{ code: string }>(`select code from public.subjects order by position`);
    expect(subjects.map((x) => x.code)).toEqual([
      "histoire",
      "geographie",
      "education-civique",
    ]);
  });

  it("propose un plan d'essai gratuit d'une semaine, en plus des abonnements payants", async () => {
    const plan = await rows<{ price_fcfa: number; duration_days: number; scope: string }>(
      `select price_fcfa, duration_days, scope from public.plans where code = 'essai-semaine'`,
    );
    expect(plan).toEqual([{ price_fcfa: 0, duration_days: 7, scope: "classe" }]);
  });

  it("n'a plus de table payments (paiement en ligne remplacé par les codes WhatsApp)", async () => {
    const r = await rows(
      `select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relname = 'payments'`,
    );
    expect(r).toEqual([]);
  });
});

describe("inscription", () => {
  it("crée profil et fiche élève, et ignore un rôle passé dans les métadonnées", async () => {
    const id = "00000000-0000-4000-8000-0000000000aa";
    await createUser(db, id, { display_name: "Fatou", role: "admin" });
    const [p] = await rows<{ role: string; display_name: string }>(
      `select role, display_name from public.profiles where id = $1`,
      [id],
    );
    expect(p).toEqual({ role: "student", display_name: "Fatou" });
    expect(await rows(`select id from public.students where id = $1`, [id])).toHaveLength(1);
  });

  it("enregistre un consentement parental en attente pour un mineur", async () => {
    const id = "00000000-0000-4000-8000-0000000000ab";
    await createUser(db, id, { is_minor: true, parent_email: "parent@example.com" });
    const [c] = await rows<{ parent_email: string; status: string }>(
      `select parent_email, status from public.consents where student_id = $1`,
      [id],
    );
    expect(c).toEqual({ parent_email: "parent@example.com", status: "pending" });
  });

  it("ne crée pas de consentement pour un majeur", async () => {
    const id = "00000000-0000-4000-8000-0000000000ac";
    await createUser(db, id, { is_minor: false, parent_email: "x@example.com" });
    expect(await rows(`select 1 from public.consents where student_id = $1`, [id])).toHaveLength(0);
    const [s] = await rows<{ is_minor: boolean }>(`select is_minor from public.students where id = $1`, [id]);
    expect(s.is_minor).toBe(false);
  });

  it("tronque un nom d'affichage trop long au lieu de faire échouer l'inscription", async () => {
    const id = "00000000-0000-4000-8000-0000000000ad";
    await createUser(db, id, { display_name: "x".repeat(200) });
    const [p] = await rows<{ display_name: string }>(`select display_name from public.profiles where id = $1`, [id]);
    expect(p.display_name).toHaveLength(60);
  });
});

describe("données personnelles", () => {
  it("un anonyme ne lit aucune donnée d'utilisateur", async () => {
    for (const t of ["profiles", "students", "subscriptions", "consents", "audit_logs"]) {
      await as(db, null, async () => {
        await expect(db.query(`select * from public.${t}`)).rejects.toThrow(/permission denied/);
      });
    }
  });

  it("un élève ne voit que son propre profil et sa propre fiche", async () => {
    await as(db, USERS.student, async () => {
      const p = await rows(`select id from public.profiles`);
      expect(p).toEqual([{ id: USERS.student }]);
      const s = await rows(`select id from public.students`);
      expect(s).toEqual([{ id: USERS.student }]);
    });
  });

  it("un admin voit tous les profils", async () => {
    await as(db, USERS.admin, async () => {
      expect(await rows(`select id from public.profiles`)).toHaveLength(4);
    });
  });

  it("un éditeur ne voit pas les profils des autres", async () => {
    await as(db, USERS.editor, async () => {
      expect(await rows(`select id from public.profiles`)).toEqual([{ id: USERS.editor }]);
    });
  });

  it("un élève peut modifier son nom et sa classe, pas son rôle ni is_minor", async () => {
    const c3 = await classId(db, "3eme");
    await as(db, USERS.student, async () => {
      await db.query(`update public.profiles set display_name = 'Awa D.' where id = $1`, [USERS.student]);
      await db.query(`update public.students set class_id = $2, onboarded_at = now() where id = $1`, [
        USERS.student,
        c3,
      ]);
      await expect(db.query(`update public.profiles set role = 'admin' where id = $1`, [USERS.student])).rejects.toThrow(
        /permission denied/,
      );
      await expect(
        db.query(`update public.students set is_minor = false where id = $1`, [USERS.student]),
      ).rejects.toThrow(/permission denied/);
    });
    const [p] = await rows<{ role: string; display_name: string }>(
      `select role, display_name from public.profiles where id = $1`,
      [USERS.student],
    );
    expect(p).toEqual({ role: "student", display_name: "Awa D." });
  });

  it("un élève ne peut pas modifier le profil d'un autre", async () => {
    await as(db, USERS.student, async () => {
      const r = await db.query(`update public.profiles set display_name = 'Piraté' where id = $1`, [USERS.other]);
      expect(r.affectedRows).toBe(0);
    });
    const [p] = await rows<{ display_name: string }>(`select display_name from public.profiles where id = $1`, [
      USERS.other,
    ]);
    expect(p.display_name).toBe("Modou");
  });

  it("un élève ne peut ni créer ni modifier un abonnement", async () => {
    // Le staff a le droit SQL d'écrire dans subscriptions (geste admin manuel) ;
    // un élève passe donc le grant mais reste bloqué par RLS (pas de policy
    // d'insertion pour lui — seules redeem_access_code() et le webhook écrivent).
    await as(db, USERS.student, async () => {
      await expect(
        db.query(
          `insert into public.subscriptions (user_id, plan, ends_at) values ($1, 'annuelle', now() + interval '1 year')`,
          [USERS.student],
        ),
      ).rejects.toThrow(/row-level security/);
    });
  });

  it("admin_set_role : réservé à l'admin, ne permet pas l'auto-promotion", async () => {
    await as(db, USERS.student, async () => {
      await expect(db.query(`select public.admin_set_role($1, 'admin')`, [USERS.student])).rejects.toThrow(
        /Réservé aux administrateurs/,
      );
    });
    await as(db, USERS.admin, async () => {
      await db.query(`select public.admin_set_role($1, 'editor')`, [USERS.student]);
    });
    const [p] = await rows<{ role: string }>(`select role from public.profiles where id = $1`, [USERS.student]);
    expect(p).toEqual({ role: "editor" });
  });
});

describe("catalogue : lecture", () => {
  it("un anonyme voit les chapitres publiés seulement", async () => {
    await insertChapter(db, { slug: "pub", class: "3eme", status: "published" });
    await insertChapter(db, { slug: "brouillon", class: "3eme", status: "draft", reviewedBy: null });
    await as(db, null, async () => {
      const r = await rows(`select slug from public.chapters`);
      expect(r).toEqual([{ slug: "pub" }]);
    });
  });

  it("le corps d'une leçon gratuite publiée est lisible sans compte", async () => {
    const ch = await insertChapter(db, { slug: "libre", class: "3eme" });
    await insertLesson(db, ch, { tier: "free" });
    await as(db, null, async () => {
      expect(await rows(`select body_md from public.lessons`)).toHaveLength(1);
    });
  });

  it("le corps d'une leçon premium est masqué à un élève sans abonnement", async () => {
    const ch = await insertChapter(db, { slug: "prem", class: "3eme" });
    await insertLesson(db, ch, { tier: "premium" });
    for (const uid of [null, USERS.student]) {
      await as(db, uid, async () => {
        expect(await rows(`select id from public.lessons`)).toHaveLength(0);
      });
    }
  });

  it("un abonnement actif ouvre les leçons premium de la classe", async () => {
    const ch = await insertChapter(db, { slug: "prem", class: "3eme" });
    await insertLesson(db, ch, { tier: "premium" });
    await db.query(
      `insert into public.subscriptions (user_id, plan, ends_at) values ($1, 'mensuelle', now() + interval '30 days')`,
      [USERS.student],
    );
    await as(db, USERS.student, async () => {
      expect(await rows(`select id from public.lessons`)).toHaveLength(1);
    });
    await as(db, USERS.other, async () => {
      expect(await rows(`select id from public.lessons`)).toHaveLength(0);
    });
  });

  it("un abonnement expiré ou annulé n'ouvre rien", async () => {
    const ch = await insertChapter(db, { slug: "prem", class: "3eme" });
    await insertLesson(db, ch, { tier: "premium" });
    await db.query(
      `insert into public.subscriptions (user_id, plan, starts_at, ends_at)
       values ($1, 'mensuelle', now() - interval '60 days', now() - interval '30 days')`,
      [USERS.student],
    );
    await db.query(
      `insert into public.subscriptions (user_id, plan, status, ends_at)
       values ($1, 'mensuelle', 'cancelled', now() + interval '30 days')`,
      [USERS.student],
    );
    await as(db, USERS.student, async () => {
      expect(await rows(`select id from public.lessons`)).toHaveLength(0);
    });
  });

  it("un pack limité à une classe n'ouvre pas les contenus des autres classes", async () => {
    const t = await insertChapter(db, { slug: "prem-tle", class: "terminale" });
    await insertLesson(db, t, { tier: "premium" });
    const c3 = await classId(db, "3eme");
    await db.query(
      `insert into public.subscriptions (user_id, class_id, plan, ends_at)
       values ($1, $2, 'pack-bfem', now() + interval '30 days')`,
      [USERS.student, c3],
    );
    await as(db, USERS.student, async () => {
      expect(await rows(`select id from public.lessons`)).toHaveLength(0);
    });
  });

  it("une leçon non publiée n'est jamais lisible, même avec un abonnement", async () => {
    const ch = await insertChapter(db, { slug: "ch", class: "3eme" });
    await insertLesson(db, ch, { level: 1, status: "draft", tier: "free" });
    await insertLesson(db, ch, { level: 2, status: "validated", tier: "free" });
    await db.query(
      `insert into public.subscriptions (user_id, plan, ends_at) values ($1, 'annuelle', now() + interval '1 year')`,
      [USERS.student],
    );
    await as(db, USERS.student, async () => {
      expect(await rows(`select id from public.lessons`)).toHaveLength(0);
    });
  });

  it("une leçon publiée d'un chapitre non publié reste masquée", async () => {
    const ch = await insertChapter(db, { slug: "ch", class: "3eme", status: "validated" });
    await insertLesson(db, ch, { tier: "free" });
    await as(db, USERS.student, async () => {
      expect(await rows(`select id from public.lessons`)).toHaveLength(0);
    });
  });

  it("le staff voit les brouillons", async () => {
    const ch = await insertChapter(db, { slug: "ch", class: "3eme", status: "draft", reviewedBy: null });
    await insertLesson(db, ch, { status: "draft" });
    await as(db, USERS.editor, async () => {
      expect(await rows(`select id from public.lessons`)).toHaveLength(1);
      expect(await rows(`select id from public.chapters`)).toHaveLength(1);
    });
  });
});

describe("exercices : chapitre ou leçon, jamais les deux", () => {
  const insertExercise = (opts: { chapterId?: string; lessonId?: string; tier?: string; status?: string }) =>
    db.query<{ id: string }>(
      `insert into public.exercises (chapter_id, lesson_id, position, type, title, status, access_tier, reviewed_by)
       values ($1, $2, 1, 'qcm', 'Exo', $3, $4, $5) returning id`,
      [
        opts.chapterId ?? null,
        opts.lessonId ?? null,
        opts.status ?? "published",
        opts.tier ?? "free",
        USERS.admin,
      ],
    );

  it("refuse un exercice sans chapitre ni leçon, ou avec les deux", async () => {
    const ch = await insertChapter(db, { slug: "ch", class: "3eme" });
    const les = await insertLesson(db, ch);
    await expect(insertExercise({})).rejects.toThrow(/exercises_scope_check/);
    await expect(insertExercise({ chapterId: ch, lessonId: les })).rejects.toThrow(/exercises_scope_check/);
  });

  it("un exercice de chapitre gratuit est lisible sans compte, un premium est masqué", async () => {
    const chFree = await insertChapter(db, { slug: "libre", class: "3eme" });
    await insertExercise({ chapterId: chFree, tier: "free" });
    const chPrem = await insertChapter(db, { slug: "prem", class: "3eme" });
    await insertExercise({ chapterId: chPrem, tier: "premium" });
    await as(db, null, async () => {
      expect(await rows(`select id from public.exercises`)).toHaveLength(1);
    });
  });

  it("un exercice de leçon suit la même règle d'accès (gratuit vs premium, abonnement)", async () => {
    const ch = await insertChapter(db, { slug: "ch", class: "3eme" });
    const lesFree = await insertLesson(db, ch, { level: 1, tier: "free" });
    const lesPrem = await insertLesson(db, ch, { level: 2, tier: "premium" });
    await insertExercise({ lessonId: lesFree, tier: "free" });
    await insertExercise({ lessonId: lesPrem, tier: "premium" });

    await as(db, null, async () => {
      expect(await rows(`select id from public.exercises`)).toHaveLength(1);
    });

    await db.query(
      `insert into public.subscriptions (user_id, plan, ends_at) values ($1, 'mensuelle', now() + interval '30 days')`,
      [USERS.student],
    );
    await as(db, USERS.student, async () => {
      expect(await rows(`select id from public.exercises`)).toHaveLength(2);
    });
  });

  it("un exercice de leçon d'un chapitre non publié reste masqué même si la leçon est publiée", async () => {
    const ch = await insertChapter(db, { slug: "ch", class: "3eme", status: "validated" });
    const les = await insertLesson(db, ch, { tier: "free" });
    await insertExercise({ lessonId: les, tier: "free" });
    await as(db, USERS.student, async () => {
      expect(await rows(`select id from public.exercises`)).toHaveLength(0);
    });
  });

  it("le staff voit les exercices de leçon en brouillon", async () => {
    const ch = await insertChapter(db, { slug: "ch", class: "3eme" });
    const les = await insertLesson(db, ch);
    await insertExercise({ lessonId: les, status: "draft" });
    await as(db, USERS.editor, async () => {
      expect(await rows(`select id from public.exercises`)).toHaveLength(1);
    });
  });

  it("l'accès d'un exercice de leçon est toujours resynchronisé sur celui de sa leçon, même si on tente autre chose", async () => {
    const ch = await insertChapter(db, { slug: "ch", class: "3eme" });
    const lesFree = await insertLesson(db, ch, { level: 1, tier: "free" });
    // On tente d'insérer un exercice 'premium' sur une leçon gratuite : la synchro l'écrase en 'free'.
    const { rows: inserted } = await insertExercise({ lessonId: lesFree, tier: "premium" });
    expect(
      await rows<{ access_tier: string }>(`select access_tier from public.exercises where id = $1`, [
        inserted[0].id,
      ]),
    ).toEqual([{ access_tier: "free" }]);

    // Un exercice de chapitre, lui, garde le tier explicitement choisi (pas concerné par la synchro).
    const chPrem = await insertChapter(db, { slug: "prem2", class: "3eme" });
    const { rows: chapEx } = await insertExercise({ chapterId: chPrem, tier: "premium" });
    expect(
      await rows<{ access_tier: string }>(`select access_tier from public.exercises where id = $1`, [chapEx[0].id]),
    ).toEqual([{ access_tier: "premium" }]);
  });
});

describe("ressources complémentaires de leçon", () => {
  const insertResource = (lessonId: string, opts: { url?: string; position?: number } = {}) =>
    db.query<{ id: string }>(
      `insert into public.lesson_resources (lesson_id, type, title, url, position, created_by)
       values ($1, 'video', 'Ressource', $2, $3, $4) returning id`,
      [lessonId, opts.url ?? "https://example.org/video", opts.position ?? 1, USERS.admin],
    );

  it("une ressource suit la visibilité de sa leçon (gratuite vs premium, abonnement)", async () => {
    const ch = await insertChapter(db, { slug: "ch", class: "3eme" });
    const lesFree = await insertLesson(db, ch, { level: 1, tier: "free" });
    const lesPrem = await insertLesson(db, ch, { level: 2, tier: "premium" });
    await insertResource(lesFree);
    await insertResource(lesPrem);

    await as(db, null, async () => {
      expect(await rows(`select id from public.lesson_resources`)).toHaveLength(1);
    });

    await db.query(
      `insert into public.subscriptions (user_id, plan, ends_at) values ($1, 'mensuelle', now() + interval '30 days')`,
      [USERS.student],
    );
    await as(db, USERS.student, async () => {
      expect(await rows(`select id from public.lesson_resources`)).toHaveLength(2);
    });
  });

  it("refuse une URL qui ne commence pas par http(s)://", async () => {
    const ch = await insertChapter(db, { slug: "ch2", class: "3eme" });
    const les = await insertLesson(db, ch, { tier: "free" });
    await expect(insertResource(les, { url: "javascript:alert(1)" })).rejects.toThrow(
      /lesson_resources_url_check/,
    );
  });

  it("un élève ne peut pas ajouter directement une ressource (staff seulement)", async () => {
    const ch = await insertChapter(db, { slug: "ch3", class: "3eme" });
    const les = await insertLesson(db, ch, { tier: "free" });
    await as(db, USERS.student, async () => {
      await expect(insertResource(les)).rejects.toThrow(/row-level security/);
    });
  });
});

describe("sujets d'examen (BFEM)", () => {
  const insertPaper = async (opts: {
    year?: number;
    position?: number;
    tier?: string;
    status?: string;
    subject?: string;
  }) =>
    db.query<{ id: string }>(
      `insert into public.exam_papers (class_id, subject_id, year, position, title, status, access_tier, reviewed_by)
       values ($1, $2, $3, $4, 'BFEM', $5, $6, $7) returning id`,
      [
        await classId(db, "3eme"),
        await subjectId(db, opts.subject ?? "histoire"),
        opts.year ?? 2024,
        opts.position ?? 1,
        opts.status ?? "published",
        opts.tier ?? "free",
        USERS.admin,
      ],
    );

  it("un sujet gratuit publié est lisible sans compte, un premium est masqué", async () => {
    await insertPaper({ year: 2024, tier: "free" });
    await insertPaper({ year: 2023, tier: "premium" });
    await as(db, null, async () => {
      const r = await rows<{ year: number }>(`select year from public.exam_papers`);
      expect(r).toEqual([{ year: 2024 }]);
    });
  });

  it("un abonnement actif ouvre les sujets premium de la classe/matière", async () => {
    await insertPaper({ year: 2022, tier: "premium" });
    await db.query(
      `insert into public.subscriptions (user_id, plan, ends_at) values ($1, 'annuelle', now() + interval '1 year')`,
      [USERS.student],
    );
    await as(db, USERS.student, async () => {
      expect(await rows(`select id from public.exam_papers`)).toHaveLength(1);
    });
    await as(db, USERS.other, async () => {
      expect(await rows(`select id from public.exam_papers`)).toHaveLength(0);
    });
  });

  it("un brouillon n'est jamais lisible par un élève, même avec abonnement", async () => {
    await insertPaper({ year: 2021, tier: "free", status: "draft" });
    await as(db, USERS.student, async () => {
      expect(await rows(`select id from public.exam_papers`)).toHaveLength(0);
    });
  });

  it("le staff voit les brouillons et un élève ne peut pas en créer", async () => {
    await insertPaper({ year: 2020, status: "draft" });
    await as(db, USERS.editor, async () => {
      expect(await rows(`select id from public.exam_papers`)).toHaveLength(1);
    });
    await as(db, USERS.student, async () => {
      await expect(
        db.query(
          `insert into public.exam_papers (class_id, subject_id, year, title) values ($1, $2, 2019, 'BFEM')`,
          [await classId(db, "3eme"), await subjectId(db)],
        ),
      ).rejects.toThrow(/row-level security/);
    });
  });

  it("une même position ne peut pas être dupliquée pour la même (classe, matière, examen, année)", async () => {
    await insertPaper({ year: 2024, position: 1, tier: "premium" });
    await expect(insertPaper({ year: 2024, position: 1, tier: "premium" })).rejects.toThrow(
      /exam_papers_position_unique/,
    );
    // Une position différente pour la même année est en revanche autorisée
    // (plusieurs sujets probables par matière et par année).
    await insertPaper({ year: 2024, position: 2, tier: "premium" });
  });

  it("exam_papers_locked_counts compte les sujets premium masqués, sans révéler leur contenu", async () => {
    const cid = await classId(db, "3eme");
    await insertPaper({ year: 2024, position: 1, tier: "free", subject: "histoire" });
    await insertPaper({ year: 2024, position: 2, tier: "premium", subject: "histoire" });
    await insertPaper({ year: 2024, position: 3, tier: "premium", subject: "histoire" });
    await insertPaper({ year: 2023, tier: "premium", subject: "geographie" });

    await as(db, USERS.student, async () => {
      const r = await rows<{ subject_id: string; year: number; locked_count: number }>(
        `select * from public.exam_papers_locked_counts($1)`,
        [cid],
      );
      const histoire2024 = r.find((x) => x.year === 2024);
      const geo2023 = r.find((x) => x.year === 2023);
      expect(histoire2024?.locked_count).toBe(2);
      expect(geo2023?.locked_count).toBe(1);
    });

    // Abonné : plus aucun sujet masqué.
    await db.query(
      `insert into public.subscriptions (user_id, plan, ends_at) values ($1, 'annuelle', now() + interval '1 year')`,
      [USERS.student],
    );
    await as(db, USERS.student, async () => {
      expect(await rows(`select * from public.exam_papers_locked_counts($1)`, [cid])).toEqual([]);
    });
  });

  it("au plus deux sujets gratuits par matière, un troisième est refusé", async () => {
    await insertPaper({ year: 2024, position: 1, tier: "free", subject: "histoire" });
    await insertPaper({ year: 2024, position: 2, tier: "free", subject: "histoire" });
    await expect(
      insertPaper({ year: 2024, position: 3, tier: "free", subject: "histoire" }),
    ).rejects.toThrow(/Au plus deux sujets gratuits par matière/);
    // Une autre matière a droit à ses propres deux sujets gratuits, indépendamment.
    await insertPaper({ year: 2023, tier: "free", subject: "geographie" });
    await insertPaper({ year: 2022, position: 2, tier: "free", subject: "geographie" });
    // Le reste (premium) n'est jamais limité.
    await insertPaper({ year: 2021, tier: "premium", subject: "education-civique" });
  });
});

describe("vue subscription_reminders_due (rappels Make)", () => {
  // ends_at est calculé par décalage de jours depuis maintenant ; la vue
  // compare des DATES (ends_at::date - current_date), donc on se place en
  // milieu de journée pour ne jamais tomber pile sur un changement de jour.
  // starts_at fixé dans le passé (pas "now()") : un abonnement expirant
  // aujourd'hui même (daysUntilEnd = 0) doit rester valide vis-à-vis de la
  // contrainte ends_at > starts_at, quelle que soit l'heure d'exécution du test.
  const insertSub = (daysUntilEnd: number, opts: { status?: string; already?: "7d" | "3d" | "1d" } = {}) =>
    db.query<{ id: string }>(
      `insert into public.subscriptions (user_id, plan, status, starts_at, ends_at, reminder_7d_sent_at, reminder_3d_sent_at, reminder_1d_sent_at)
       values ($1, 'mensuelle', $2,
               now() - interval '60 days',
               date_trunc('day', now()) + interval '12 hours' + ($3 || ' days')::interval,
               $4, $5, $6)
       returning id`,
      [
        USERS.student,
        opts.status ?? "active",
        daysUntilEnd,
        opts.already === "7d" ? new Date().toISOString() : null,
        opts.already === "3d" ? new Date().toISOString() : null,
        opts.already === "1d" ? new Date().toISOString() : null,
      ],
    );

  it("propose un rappel à J-7, J-3 et J-1, jamais aux autres échéances", async () => {
    await insertSub(7);
    await insertSub(3);
    await insertSub(1);
    await insertSub(5); // ne doit jamais apparaître
    await insertSub(0); // expire aujourd'hui : hors périmètre des rappels
    const due = await rows<{ reminder_kind: string }>(
      `select reminder_kind from public.subscription_reminders_due order by reminder_kind`,
    );
    expect(due.map((r) => r.reminder_kind)).toEqual(["1d", "3d", "7d"]);
  });

  it("ne propose pas deux fois le même rappel déjà envoyé", async () => {
    await insertSub(7, { already: "7d" });
    await insertSub(3, { already: "3d" });
    await insertSub(1, { already: "1d" });
    expect(await rows(`select 1 from public.subscription_reminders_due`)).toHaveLength(0);
  });

  it("ignore les abonnements expirés/annulés", async () => {
    await insertSub(7, { status: "expired" });
    await insertSub(3, { status: "cancelled" });
    expect(await rows(`select 1 from public.subscription_reminders_due`)).toHaveLength(0);
  });

  it("ne renvoie que le courriel et les champs utiles, pas de données sensibles superflues", async () => {
    await insertSub(7);
    const [row] = await rows<Record<string, unknown>>(`select * from public.subscription_reminders_due`);
    expect(Object.keys(row).sort()).toEqual(
      ["display_name", "ends_at", "email", "plan", "reminder_kind", "subscription_id", "user_id"].sort(),
    );
    expect(row.email).toBe(`${USERS.student}@test.local`);
  });

  it("un élève ne peut pas lire cette vue (réservée à service_role)", async () => {
    await insertSub(7);
    await as(db, USERS.student, async () => {
      await expect(db.query(`select 1 from public.subscription_reminders_due`)).rejects.toThrow(
        /permission denied/,
      );
    });
  });
});

describe("assistant IA : quota quotidien", () => {
  it("incrémente le compteur du jour à chaque appel, un par utilisateur", async () => {
    await as(db, USERS.student, async () => {
      const r1 = await rows<{ message_count: number }>(`select * from public.increment_ai_usage()`);
      expect(r1[0].message_count).toBe(1);
      const r2 = await rows<{ message_count: number }>(`select * from public.increment_ai_usage()`);
      expect(r2[0].message_count).toBe(2);
    });
    await as(db, USERS.other, async () => {
      const r = await rows<{ message_count: number }>(`select * from public.increment_ai_usage()`);
      expect(r[0].message_count).toBe(1); // compteur indépendant de celui de USERS.student
    });
  });

  it("un élève ne voit que son propre compteur, un admin voit tout", async () => {
    await as(db, USERS.student, async () => {
      await db.query(`select public.increment_ai_usage()`);
    });
    await as(db, USERS.other, async () => {
      await db.query(`select public.increment_ai_usage()`);
    });
    await as(db, USERS.student, async () => {
      expect(await rows(`select user_id from public.ai_usage`)).toEqual([{ user_id: USERS.student }]);
    });
    await as(db, USERS.admin, async () => {
      expect(await rows(`select user_id from public.ai_usage`)).toHaveLength(2);
    });
  });

  it("un élève ne peut pas écrire directement dans ai_usage (seule la fonction le peut)", async () => {
    await as(db, USERS.student, async () => {
      await expect(
        db.query(`insert into public.ai_usage (user_id, message_count) values ($1, 999)`, [USERS.student]),
      ).rejects.toThrow(/permission denied/);
    });
  });
});

describe("verrou par appareil", () => {
  it("un appareil non enregistré n'est pas de confiance ; l'enregistrer le rend de confiance", async () => {
    await as(db, USERS.student, async () => {
      expect(await rows(`select public.is_device_trusted('device-a') as t`)).toEqual([{ t: false }]);
      await db.query(`select public.register_trusted_device('device-a')`);
      expect(await rows(`select public.is_device_trusted('device-a') as t`)).toEqual([{ t: true }]);
      expect(await rows(`select public.is_device_trusted('device-b') as t`)).toEqual([{ t: false }]);
    });
  });

  it("enregistrer un nouvel appareil remplace l'ancien (un seul appareil de confiance à la fois)", async () => {
    await as(db, USERS.student, async () => {
      await db.query(`select public.register_trusted_device('device-a')`);
      await db.query(`select public.register_trusted_device('device-b')`);
      expect(await rows(`select public.is_device_trusted('device-a') as t`)).toEqual([{ t: false }]);
      expect(await rows(`select public.is_device_trusted('device-b') as t`)).toEqual([{ t: true }]);
    });
  });

  it("confirme un nouvel appareil avec le bon jeton ET le bon appareil, remplace l'ancien", async () => {
    let token = "";
    await as(db, USERS.student, async () => {
      await db.query(`select public.register_trusted_device('device-a')`);
      token = (await rows<{ request_device_confirmation: string }>(
        `select public.request_device_confirmation('device-b')`,
      ))[0].request_device_confirmation;
    });
    await as(db, USERS.student, async () => {
      // Mauvais appareil : le lien n'est pas partageable, même avec le bon jeton.
      expect(await rows(`select public.confirm_device($1, 'device-c') as ok`, [token])).toEqual([{ ok: false }]);
      expect(await rows(`select public.is_device_trusted('device-b') as t`)).toEqual([{ t: false }]);
      // Bon appareil : la confirmation réussit et remplace l'appareil de confiance.
      expect(await rows(`select public.confirm_device($1, 'device-b') as ok`, [token])).toEqual([{ ok: true }]);
      expect(await rows(`select public.is_device_trusted('device-b') as t`)).toEqual([{ t: true }]);
      expect(await rows(`select public.is_device_trusted('device-a') as t`)).toEqual([{ t: false }]);
    });
  });

  it("un jeton déjà consommé ne peut pas être réutilisé", async () => {
    let token = "";
    await as(db, USERS.student, async () => {
      token = (await rows<{ request_device_confirmation: string }>(
        `select public.request_device_confirmation('device-b')`,
      ))[0].request_device_confirmation;
      await db.query(`select public.confirm_device($1, 'device-b')`, [token]);
    });
    await as(db, USERS.student, async () => {
      expect(await rows(`select public.confirm_device($1, 'device-b') as ok`, [token])).toEqual([{ ok: false }]);
    });
  });

  it("le jeton d'un autre utilisateur ne peut pas être utilisé pour confirmer son propre appareil", async () => {
    let token = "";
    await as(db, USERS.student, async () => {
      token = (await rows<{ request_device_confirmation: string }>(
        `select public.request_device_confirmation('device-b')`,
      ))[0].request_device_confirmation;
    });
    await as(db, USERS.other, async () => {
      expect(await rows(`select public.confirm_device($1, 'device-b') as ok`, [token])).toEqual([{ ok: false }]);
    });
  });

  it("un élève ne peut pas lire l'appareil de confiance d'un autre compte", async () => {
    await as(db, USERS.student, async () => {
      await db.query(`select public.register_trusted_device('device-a')`);
    });
    await as(db, USERS.other, async () => {
      expect(await rows(`select user_id from public.trusted_devices`)).toEqual([]);
    });
  });
});

describe("catalogue : écriture et workflow de validation", () => {
  const newChapter = async (status = "draft") =>
    db.query<{ id: string }>(
      `insert into public.chapters (class_id, subject_id, slug, title, status) values ($1, $2, 'nouveau', 'Nouveau', $3) returning id`,
      [await classId(db, "3eme"), await subjectId(db), status],
    );

  it("un élève ne peut pas créer de chapitre", async () => {
    await as(db, USERS.student, async () => {
      await expect(newChapter()).rejects.toThrow(/row-level security/);
    });
  });

  it("un éditeur crée en brouillon (premium par défaut) et le workflow est tracé", async () => {
    let id = "";
    await as(db, USERS.editor, async () => {
      const r = await newChapter();
      id = r.rows[0].id;
      await db.query(`update public.chapters set status = 'in_review' where id = $1`, [id]);
      await db.query(`update public.chapters set status = 'validated' where id = $1`, [id]);
    });
    const [c] = await rows<{ access_tier: string; reviewed_by: string; created_by: string; status: string }>(
      `select access_tier, reviewed_by, created_by, status from public.chapters where id = $1`,
      [id],
    );
    expect(c).toEqual({ access_tier: "premium", reviewed_by: USERS.editor, created_by: USERS.editor, status: "validated" });
    const log = (
      await rows<{ meta: { from: string | null; to: string } }>(
        `select meta from public.audit_logs where entity_id = $1 order by id`,
        [id],
      )
    ).map((x) => `${x.meta.from}->${x.meta.to}`);
    expect(log).toEqual(["null->draft", "draft->in_review", "in_review->validated"]);
  });

  it("refuse de créer un contenu directement publié", async () => {
    await as(db, USERS.editor, async () => {
      await expect(newChapter("published")).rejects.toThrow(/brouillon/);
    });
    await as(db, USERS.admin, async () => {
      await expect(newChapter("published")).rejects.toThrow(/brouillon/);
    });
  });

  it("un éditeur ne peut pas publier ; un admin le peut, depuis « validé » seulement", async () => {
    let id = "";
    await as(db, USERS.editor, async () => {
      id = (await newChapter()).rows[0].id;
      await expect(db.query(`update public.chapters set status = 'published' where id = $1`, [id])).rejects.toThrow(
        /validé/,
      );
      await db.query(`update public.chapters set status = 'validated' where id = $1`, [id]);
      await expect(db.query(`update public.chapters set status = 'published' where id = $1`, [id])).rejects.toThrow(
        /administrateur/,
      );
    });
    await as(db, USERS.admin, async () => {
      await db.query(`update public.chapters set status = 'published' where id = $1`, [id]);
    });
    expect((await rows(`select status from public.chapters where id = $1`, [id]))[0]).toEqual({ status: "published" });
  });

  it("un admin ne peut pas publier un brouillon sans passer par la validation", async () => {
    let id = "";
    await as(db, USERS.admin, async () => {
      id = (await newChapter()).rows[0].id;
      await expect(db.query(`update public.chapters set status = 'published' where id = $1`, [id])).rejects.toThrow(
        /validé/,
      );
    });
  });

  it("refuse une publication sans validateur humain, même côté serveur", async () => {
    await expect(insertChapter(db, { slug: "sans-relecteur", class: "3eme", status: "published", reviewedBy: null })).rejects.toThrow(
      /validateur/,
    );
  });

  it("le journal d'audit n'est lisible que par un admin", async () => {
    await insertChapter(db, { slug: "ch", class: "3eme" });
    await as(db, USERS.admin, async () => {
      expect((await rows(`select id from public.audit_logs`)).length).toBeGreaterThan(0);
    });
    await as(db, USERS.editor, async () => {
      expect(await rows(`select id from public.audit_logs`)).toHaveLength(0);
    });
    await as(db, USERS.student, async () => {
      expect(await rows(`select id from public.audit_logs`)).toHaveLength(0);
    });
  });

  it("personne (hors serveur) ne peut écrire dans le journal d'audit", async () => {
    await as(db, USERS.admin, async () => {
      await expect(
        db.query(`insert into public.audit_logs (action, entity) values ('faux', 'x')`),
      ).rejects.toThrow(/permission denied/);
    });
  });
});
