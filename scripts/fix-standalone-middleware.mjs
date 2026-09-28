// Contournement : sur cette version de Next.js (16.3.6), le fichier compilé du proxy
// (src/proxy.ts, toujours nommé middleware.js dans la sortie) n'est PAS copié par Next.js
// dans .next/standalone/.next/server/, alors qu'il est bien présent dans .next/server/.
// Conséquence sans ce script : `opennextjs-cloudflare build` échoue avec
// "File server/middleware.js does not exist" lors du traçage de la sortie standalone.
//
// Ce script copie le fichier manquant avant que l'adaptateur Cloudflare ne lise la sortie
// standalone. À retirer dès qu'une version plus récente de Next.js ou d'OpenNext corrige
// ce traçage (vérifier à chaque montée de version, voir audit technique, section 15).
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const from = (name) => join(".next", "server", name);
const to = (name) => join(".next", "standalone", ".next", "server", name);

const files = ["middleware.js", "middleware.js.map"];
let copied = 0;

for (const file of files) {
  const source = from(file);
  const dest = to(file);
  if (existsSync(source) && !existsSync(dest)) {
    copyFileSync(source, dest);
    copied += 1;
  }
}

if (copied > 0) {
  console.log(`[fix-standalone-middleware] ${copied} fichier(s) copié(s) vers la sortie standalone.`);
} else if (!existsSync(from("middleware.js"))) {
  console.log("[fix-standalone-middleware] Aucun proxy compilé trouvé (normal si src/proxy.ts a été retiré).");
} else {
  console.log("[fix-standalone-middleware] Déjà présent, rien à faire.");
}
