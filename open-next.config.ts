import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Configuration minimale : pas de cache incrémental R2 pour l'instant (aucune page ISR
// dans le MVP — tout est soit statique, soit toujours dynamique via connection()/cookies()).
// À ajouter dès qu'une page utilise la revalidation incrémentale (voir audit, section 15).
export default defineCloudflareConfig();
