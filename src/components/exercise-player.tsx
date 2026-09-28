"use client";

import { useMemo, useState } from "react";
import { buttonClass } from "@/components/ui";
import { renderLessonMarkdown } from "@/lib/markdown";

type QcmQuestion = { num: number; text: string; options: { label: string; text: string }[]; correctLabel: string | null };
type QuizQuestion = { num: number; text: string; answer: string };

type Props =
  | { type: "qcm"; data: { questions: QcmQuestion[] }; correctionMd: string }
  | { type: "quiz"; data: { questions: QuizQuestion[] }; correctionMd: string }
  | { type: "dissertation" | "commentaire" | "autre"; statementMd: string; correctionMd: string };

export function ExercisePlayer(props: Props) {
  if (props.type === "qcm") return <QcmPlayer data={props.data} />;
  if (props.type === "quiz") return <QuizPlayer data={props.data} />;
  return <OpenAnswerPlayer statementMd={props.statementMd} correctionMd={props.correctionMd} />;
}

function QcmPlayer({ data }: { data: { questions: QcmQuestion[] } }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [corrected, setCorrected] = useState(false);
  const total = data.questions.length;
  const score = useMemo(
    () => data.questions.filter((q) => answers[q.num] && answers[q.num] === q.correctLabel).length,
    [answers, data.questions],
  );
  const allAnswered = data.questions.every((q) => answers[q.num]);

  return (
    <div className="flex flex-col gap-5">
      {data.questions.map((q) => {
        const picked = answers[q.num];
        return (
          <fieldset key={q.num} className="rounded-2xl border border-line p-4">
            <legend className="px-1 font-bold">
              {q.num}. {q.text}
            </legend>
            <div className="mt-2 flex flex-col gap-1.5">
              {q.options.map((o) => {
                const isPicked = picked === o.label;
                const isCorrect = o.label === q.correctLabel;
                const showState = corrected && (isPicked || isCorrect);
                return (
                  <label
                    key={o.label}
                    className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                      showState
                        ? isCorrect
                          ? "border-brand bg-brand/10"
                          : "border-red-400 bg-red-50"
                        : "border-line"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${q.num}`}
                      value={o.label}
                      checked={isPicked}
                      disabled={corrected}
                      onChange={() => setAnswers((a) => ({ ...a, [q.num]: o.label }))}
                    />
                    <span>
                      {o.label}) {o.text}
                    </span>
                    {corrected && isCorrect && <span className="ml-auto text-xs font-bold text-brand">✓ Bonne réponse</span>}
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      {!corrected ? (
        <button
          type="button"
          disabled={!allAnswered}
          onClick={() => setCorrected(true)}
          className={`${buttonClass("primary")} self-start disabled:opacity-40`}
        >
          Corriger
        </button>
      ) : (
        <div className="card-glow rounded-2xl border border-line bg-surface p-4 text-center">
          <p className="text-2xl font-bold text-brand">
            {score} / {total}
          </p>
          <p className="text-sm text-muted">points obtenus</p>
        </div>
      )}
    </div>
  );
}

function QuizPlayer({ data }: { data: { questions: QuizQuestion[] } }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [selfMarks, setSelfMarks] = useState<Record<number, boolean>>({});
  const [revealed, setRevealed] = useState(false);
  const total = data.questions.length;
  const score = Object.values(selfMarks).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-4">
      {data.questions.map((q) => (
        <div key={q.num} className="rounded-2xl border border-line p-4">
          <p className="font-bold">
            {q.num}. {q.text}
          </p>
          <input
            type="text"
            value={answers[q.num] ?? ""}
            disabled={revealed}
            onChange={(e) => setAnswers((a) => ({ ...a, [q.num]: e.target.value }))}
            placeholder="Ta réponse"
            className="mt-2 min-h-11 w-full rounded-xl border border-line bg-transparent px-3 text-sm"
          />
          {revealed && (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-brand/10 px-3 py-2 text-sm">
              <span>
                Réponse attendue : <strong>{q.answer}</strong>
              </span>
              <label className="flex items-center gap-1.5 whitespace-nowrap text-xs font-bold">
                <input
                  type="checkbox"
                  checked={selfMarks[q.num] ?? false}
                  onChange={(e) => setSelfMarks((m) => ({ ...m, [q.num]: e.target.checked }))}
                />
                J&apos;avais juste
              </label>
            </div>
          )}
        </div>
      ))}

      {!revealed ? (
        <button type="button" onClick={() => setRevealed(true)} className={`${buttonClass("primary")} self-start`}>
          Voir les réponses
        </button>
      ) : (
        <div className="card-glow rounded-2xl border border-line bg-surface p-4 text-center">
          <p className="text-2xl font-bold text-brand">
            {score} / {total}
          </p>
          <p className="text-sm text-muted">coche « j&apos;avais juste » pour chaque bonne réponse</p>
        </div>
      )}
    </div>
  );
}

function OpenAnswerPlayer({ statementMd, correctionMd }: { statementMd: string; correctionMd: string }) {
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [selfScore, setSelfScore] = useState<number | "">("");

  return (
    <div className="flex flex-col gap-4">
      <div>{renderLessonMarkdown(statementMd)}</div>

      <div>
        <label htmlFor="answer" className="text-sm font-bold">
          Ta réponse
        </label>
        <textarea
          id="answer"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={8}
          placeholder="Rédige ta réponse ici avant de voir le corrigé..."
          className="mt-1 w-full rounded-xl border border-line bg-transparent p-3 text-sm leading-relaxed"
        />
      </div>

      {!revealed ? (
        <button type="button" onClick={() => setRevealed(true)} className={`${buttonClass("primary")} self-start`}>
          Voir le corrigé
        </button>
      ) : (
        <>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="font-bold text-brand">Corrigé</p>
            <div className="mt-2">{renderLessonMarkdown(correctionMd)}</div>
          </div>
          <div className="card-glow flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
            <label htmlFor="self-score" className="text-sm font-bold">
              Ta note (auto-évaluation, sur 20)
            </label>
            <input
              id="self-score"
              type="number"
              min={0}
              max={20}
              value={selfScore}
              onChange={(e) => setSelfScore(e.target.value === "" ? "" : Number(e.target.value))}
              className="min-h-11 w-20 rounded-xl border border-line bg-transparent px-3 text-center text-sm"
            />
            <span className="text-sm text-muted">/ 20</span>
          </div>
        </>
      )}
    </div>
  );
}
