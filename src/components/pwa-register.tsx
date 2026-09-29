"use client";

import { useEffect } from "react";

/** Enregistre le service worker (public/sw.js) — condition nécessaire pour
 *  que le navigateur propose "Installer l'application" sur Android/Chrome. */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Pas grave : l'app reste utilisable normalement, juste pas installable.
      });
    }
  }, []);
  return null;
}
