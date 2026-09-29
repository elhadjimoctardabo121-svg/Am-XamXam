import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { AiProvider, ChatMessage } from "./provider";

// Modèle multilingue, correct en français, disponible dans le quota gratuit
// quotidien de Cloudflare Workers AI (10 000 "neurones"/jour) — déjà inclus
// dans le compte Cloudflare existant du projet, aucun nouveau service.
const MODEL = "@cf/meta/llama-3.1-8b-instruct";

export const cloudflareWorkersAi: AiProvider = {
  async chat(messages, systemPrompt) {
    const { env } = await getCloudflareContext({ async: true });
    const result = await env.AI.run(MODEL, {
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: 512,
    });
    const text = (result as { response?: string }).response;
    return (text ?? "").trim();
  },
};
