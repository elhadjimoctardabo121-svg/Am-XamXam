/**
 * Abstraction AI_PROVIDER (cahier des charges, section 6) : l'app ne parle
 * jamais directement à un fournisseur IA précis, seulement à cette
 * interface. Remplacer Cloudflare Workers AI par Claude API, Gemini, Groq...
 * se fait en écrivant un nouveau fichier ici et en changeant l'export dans
 * ./index.ts — rien d'autre à toucher dans l'app.
 */
export type ChatMessage = { role: "user" | "assistant"; content: string };

export interface AiProvider {
  chat(messages: ChatMessage[], systemPrompt: string): Promise<string>;
}
