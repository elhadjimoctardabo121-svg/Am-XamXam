import { cloudflareWorkersAi } from "./cloudflare-workers-ai";
import type { AiProvider } from "./provider";

export type { AiProvider, ChatMessage } from "./provider";

/** Point de bascule AI_PROVIDER : voir ./provider.ts. */
export const aiProvider: AiProvider = cloudflareWorkersAi;
