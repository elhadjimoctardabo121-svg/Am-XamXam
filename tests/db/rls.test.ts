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
    await as(db, USERS.student, async () => {
      await expect(
        db.query(
          `insert into public.subscriptions (user_id, plan, ends_at) values ($1, 'annuelle', now() + interval '1 year')`,
          [USERS.student],
        ),
      ).rejects.toThrow(/permission denied/);
    });
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
