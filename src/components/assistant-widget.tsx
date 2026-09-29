"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { askAssistant } from "@/app/actions/assistant";
import type { ChatMessage } from "@/lib/ai";

type DisplayMessage = ChatMessage & { key: number };

/** Bouton flottant + panneau de chat, présent sur les pages accessibles après connexion.
 *  Réservé aux abonnés Premium : un élève sans abonnement voit une invitation à s'abonner
 *  au premier message plutôt que le bouton disparaître (pédagogie du modèle freemium). */
export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ text: string; locked?: boolean } | null>(null);
  const nextKey = useRef(0);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || pending) return;
    setInput("");
    setError(null);
    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { key: nextKey.current++, role: "user", content: text }]);
    setPending(true);
    const res = await askAssistant(history, text);
    setPending(false);
    if ("error" in res) setError({ text: res.error, locked: res.locked });
    else setMessages((m) => [...m, { key: nextKey.current++, role: "assistant", content: res.reply }]);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Fermer l'assistant" : "Ouvrir l'assistant IA"}
        className="fixed bottom-5 right-5 z-40 flex size-14 items-center justify-center rounded-full bg-brand text-2xl text-brand-ink shadow-lg shadow-brand/30 transition hover:brightness-110"
      >
        {open ? "✕" : "💬"}
      </button>

      {open && (
        <div className="fixed inset-x-4 bottom-24 z-40 flex max-h-[70vh] flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl sm:inset-x-auto sm:right-5 sm:w-96">
          <div className="border-b border-line bg-brand-soft px-4 py-3">
            <p className="font-bold">Assistant Am-XamXAm</p>
            <p className="text-xs text-muted">Pose une question sur ton cours — je t&apos;explique simplement.</p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <p className="text-sm text-muted">
                Exemple : « Explique-moi la décolonisation simplement » ou « Donne-moi un exemple de Taylorisme ».
              </p>
            )}
            {messages.map((m) => (
              <div
                key={m.key}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === "user" ? "ml-auto bg-brand text-brand-ink" : "bg-line/50"
                }`}
              >
                {m.content}
              </div>
            ))}
            {pending && <div className="max-w-[85%] rounded-2xl bg-line/50 px-3 py-2 text-sm text-muted">…</div>}
            {error && (
              <div className="rounded-2xl border-l-4 border-danger bg-surface px-3 py-2 text-sm">
                {error.text}
                {error.locked && (
                  <Link href="/tarifs" className="mt-1 block font-bold text-brand underline underline-offset-4">
                    Voir les abonnements →
                  </Link>
                )}
              </div>
            )}
          </div>

          <form onSubmit={send} className="flex items-center gap-2 border-t border-line p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Écris ta question…"
              maxLength={1000}
              className="min-h-11 flex-1 rounded-xl border border-line bg-transparent px-3 text-sm"
            />
            <button
              type="submit"
              disabled={pending || !input.trim()}
              className="min-h-11 rounded-xl bg-brand px-4 text-sm font-bold text-brand-ink disabled:opacity-50"
            >
              Envoyer
            </button>
          </form>
        </div>
      )}
    </>
  );
}
