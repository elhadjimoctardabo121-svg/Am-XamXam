// Génère les icônes PWA (public/icons/) à partir du logo de la marque
// (mêmes formes que <Logo /> dans src/components/ui.tsx), sans dépendance
// d'édition d'image externe : uniquement `sharp`, déjà présent (Next.js).
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = join(process.cwd(), "public", "icons");
mkdirSync(OUT_DIR, { recursive: true });

// Icône "normale" : fond arrondi, comme le logo affiché dans l'app.
const standardSvg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#14d19a" />
      <stop offset="1" stop-color="#0a7f5f" />
    </linearGradient>
  </defs>
  <rect width="34" height="34" rx="10" fill="url(#g)" />
  <ellipse cx="17" cy="14" rx="10" ry="6.5" fill="#fff" />
  <path d="M14 29c.5-3.6.3-6-1.1-8.5h8.2c-1.4 2.5-1.6 4.9-1.1 8.5z" fill="#fff" />
  <circle cx="26" cy="7.5" r="3" fill="#ffc83d" />
</svg>`;

// Icône "maskable" : le fond remplit tout le canevas (l'OS applique sa
// propre forme de découpe), le motif reste dans la zone de sécurité centrale.
const maskableSvg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#14d19a" />
      <stop offset="1" stop-color="#0a7f5f" />
    </linearGradient>
  </defs>
  <rect width="34" height="34" fill="url(#g)" />
  <g transform="translate(17 17) scale(0.78) translate(-17 -17)">
    <ellipse cx="17" cy="14" rx="10" ry="6.5" fill="#fff" />
    <path d="M14 29c.5-3.6.3-6-1.1-8.5h8.2c-1.4 2.5-1.6 4.9-1.1 8.5z" fill="#fff" />
    <circle cx="26" cy="7.5" r="3" fill="#ffc83d" />
  </g>
</svg>`;

const jobs = [
  { name: "icon-192.png", svg: standardSvg(192), size: 192 },
  { name: "icon-512.png", svg: standardSvg(512), size: 512 },
  { name: "icon-maskable-192.png", svg: maskableSvg(192), size: 192 },
  { name: "icon-maskable-512.png", svg: maskableSvg(512), size: 512 },
  { name: "apple-touch-icon.png", svg: standardSvg(180), size: 180 },
];

for (const job of jobs) {
  await sharp(Buffer.from(job.svg)).resize(job.size, job.size).png().toFile(join(OUT_DIR, job.name));
  console.log(`OK ${job.name}`);
}
