import type { ReactNode } from "react";

/**
 * Rendu minimal d'un sous-ensemble de Markdown (titres ##, listes à puces, paragraphes).
 * Volontairement sans dépendance : le contenu est produit par nous (import + éditeurs
 * internes), jamais saisi librement par un visiteur, et la marge de taille du Worker
 * Cloudflare est faible (voir audit technique, section 15) — pas de lib markdown complète.
 */
export function renderLessonMarkdown(md: string): ReactNode {
  const blocks: ReactNode[] = [];
  const lines = md.split(/\r?\n/);
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push(
        <h3 key={key++} className="mt-6 text-lg font-bold first:mt-0">
          {line.slice(3).trim()}
        </h3>,
      );
      i += 1;
      continue;
    }

    if (line.trim().startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("- ")) {
        items.push(lines[i].trim().slice(2).trim());
        i += 1;
      }
      blocks.push(
        <ul key={key++} className="mt-2 list-disc space-y-1 pl-5">
          {items.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // Paragraphe : accumule les lignes jusqu'à la prochaine ligne vide.
    const paragraph: string[] = [line];
    i += 1;
    while (i < lines.length && lines[i].trim() && !lines[i].startsWith("## ") && !lines[i].trim().startsWith("- ")) {
      paragraph.push(lines[i]);
      i += 1;
    }
    blocks.push(
      <p key={key++} className="mt-3 leading-relaxed first:mt-0">
        {paragraph.join(" ")}
      </p>,
    );
  }

  return <>{blocks}</>;
}
