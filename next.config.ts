import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Requis par l'adaptateur OpenNext Cloudflare (voir audit technique, section 4).
  output: "standalone",
};

export default nextConfig;

// Donne à `next dev` les bindings Cloudflare (aucun pour l'instant : assets seulement)
// pour que le comportement en développement local se rapproche du Worker déployé.
// Uniquement en développement : appelé pendant `next build`, ça démarre un Miniflare
// local inutile et peut faire échouer le build (état local .wrangler non prêt).
if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}
