"use client";

import type { ReactNode } from "react";

/**
 * Dissuade la copie du contenu pédagogique (leçons, énoncés, corrigés) :
 * bloque la sélection de texte, le copier-coller et le clic droit. Ce n'est
 * qu'une dissuasion côté navigateur, pas une vraie protection — un élève
 * déterminé peut toujours passer par l'inspecteur ou une capture d'écran —
 * mais ça évite la copie en un clic vers un autre support.
 */
export function ProtectedContent({ children }: { children: ReactNode }) {
  return (
    <div
      className="select-none [-webkit-touch-callout:none]"
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {children}
    </div>
  );
}
