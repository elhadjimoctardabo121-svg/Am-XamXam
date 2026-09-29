"use client";

import { useState } from "react";
import { correctQcm, revealQuiz } from "@/app/actions/exercises";
import { buttonClass } from "@/components/ui";
import { renderLessonMarkdown } from "@/lib/markdown";
import { ProtectedContent } from "@/components/protected-content";

type RevealAction = (id: string) => Promise<{ correctionMd: string } | { error: string }>;

// IMPORTANT : aucune bonne réponse ni corrigé n'est passé en props ici — tout
// est demandé au serveur (Server Action) au moment où l'élève termine, pour
// qu'un corrigé ne puisse pas être lu dans le code source avant de répondre.

type QcmQuestionSafe = { num: number; text: string; options: { label: string; text: string }[] };
type QuizQuestionSafe = { num: number; text: string };

type Props =
  | { type: "qcm"; exerciseId: string; questions: QcmQuestionSafe[] }
  | { type: "quiz"; exerciseId: string; questions: QuizQuestionSafe[] }
  | { type: "dissertation" | "commentaire" | "autre"; exerciseId: string; statementMd: string; reveal: RevealAction };

export function ExercisePlayer(props: Props) {
  if (props.type === "qcm") return <QcmPlayer exerciseId={props.exerciseId} questions={props.questions} />;
  if (props.type === "quiz") return <QuizPlayer exerciseId={props.exerciseId} questions={props.questions} />;
  return <OpenAnswerPlayer exerciseId={props.exerciseId} statementMd={props.statementMd} reveal={props.reveal} />;
}

function QcmPlayer({ exerciseId, questions }: { exerciseId: string; questions: QcmQuestionSafe[] }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<{ score: number; total: number; correctByNum: Record<number, string> } | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const allAnswered = questions.every((q) => answers[q.num]);

  const submit = async () => {
    setPending(true);
    setError("");
    const res = await correctQcm(exerciseId, answers);
    setPending(false);
    if ("error" in res) setError(res.error);
    else setResult(res);
  };

  return (
    <div className="flex flex-col gap-5">
      {questions.map((q) => {
        const picked = answers[q.num];
        const correctLabel = result?.correctByNum[q.num];
        return (
          <fieldset key={q.num} className="rounded-2xl border border-line p-4">
            <legend className="px-1 font-bold">
              {q.num}. {q.text}
            </legend>
            <div className="mt-2 flex flex-col gap-1.5">
              {q.options.map((o) => {
                const isPicked = picked === o.label;
                const isCorrect = result ? o.label === correctLabel : false;
                const showState = result && (isPicked || isCorrect);
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
                      disabled={!!result}
                      onChange={() => setAnswers((a) => ({ ...a, [q.num]: o.label }))}
                    />
                    <span>
                      {o.label}) {o.text}
                    </span>
                    {result && isCorrect && <span className="ml-auto text-xs font-bold text-brand">✓ Bonne réponse</span>}
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!result ? (
        <button
          type="button"
          disabled={!allAnswered || pending}
          onClick={submit}
          className={`${buttonClass("primary")} self-start disabled:opacity-40`}
        >
          {pending ? "Correction..." : "Corriger"}
        </button>
      ) : (
        <div className="card-glow rounded-2xl border border-line bg-surface p-4 text-center">
          <p className="text-2xl font-bold text-brand">
            {result.score} / {result.total}
          </p>
          <p className="text-sm text-muted">points obtenus</p>
        </div>
      )}
    </div>
  );
}

function QuizPlayer({ exerciseId, questions }: { exerciseId: string; questions: QuizQuestionSafe[] }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [selfMarks, setSelfMarks] = useState<Record<number, boolean>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, string> | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const total = questions.length;
  const score = Object.values(selfMarks).filter(Boolean).length;
  const allAnswered = questions.every((q) => (answers[q.num] ?? "").trim().length > 0);

  const reveal = async () => {
    setPending(true);
    setError("");
    const res = await revealQuiz(exerciseId);
    setPending(false);
    if ("error" in res) setError(res.error);
    else setRevealedAnswers(res.answersByNum);
  };

  return (
    <div className="flex flex-col gap-4">
      {questions.map((q) => (
        <div key={q.num} className="rounded-2xl border border-line p-4">
          <p className="font-bold">
            {q.num}. {q.text}
          </p>
          <input
            type="text"
            value={answers[q.num] ?? ""}
            disabled={!!revealedAnswers}
            onChange={(e) => setAnswers((a) => ({ ...a, [q.num]: e.target.value }))}
            placeholder="Ta réponse"
            className="mt-2 min-h-11 w-full rounded-xl border border-line bg-transparent px-3 text-sm"
          />
          {revealedAnswers && (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-brand/10 px-3 py-2 text-sm">
              <span>
                Réponse attendue : <strong>{revealedAnswers[q.num]}</strong>
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

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!revealedAnswers ? (
        <div className="flex flex-col items-start gap-1">
          <button
            type="button"
            disabled={!allAnswered || pending}
            onClick={reveal}
            className={`${buttonClass("primary")} disabled:opacity-40`}
          >
            {pending ? "Chargement..." : "Voir les réponses"}
          </button>
          {!allAnswered && (
            <p className="text-xs text-muted">Réponds à chaque question pour débloquer la correction.</p>
          )}
        </div>
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

const MIN_ANSWER_LENGTH = 30;

function OpenAnswerPlayer({
  exerciseId,
  statementMd,
  reveal: revealAction,
}: {
  exerciseId: string;
  statementMd: string;
  reveal: RevealAction;
}) {
  const [answer, setAnswer] = useState("");
  const [correction, setCorrection] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [selfScore, setSelfScore] = useState<number | "">("");
  const answerLength = answer.trim().length;
  const canReveal = answerLength >= MIN_ANSWER_LENGTH;

  const reveal = async () => {
    setPending(true);
    setError("");
    const res = await revealAction(exerciseId);
    setPending(false);
    if ("error" in res) setError(res.error);
    else setCorrection(res.correctionMd);
  };

  return (
    <div className="flex flex-col gap-4">
      <ProtectedContent>{renderLessonMarkdown(statementMd)}</ProtectedContent>

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

      {error && <p className="text-sm text-red-600">{error}</p>}

      {correction === null ? (
        <div className="flex flex-col items-start gap-1">
          <button
            type="button"
            disabled={!canReveal || pending}
            onClick={reveal}
            className={`${buttonClass("primary")} disabled:opacity-40`}
          >
            {pending ? "Chargement..." : "Voir le corrigé"}
          </button>
          {!canReveal && (
            <p className="text-xs text-muted">
              Écris ta réponse ({answerLength}/{MIN_ANSWER_LENGTH} caractères) pour débloquer le corrigé.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="font-bold text-brand">Corrigé</p>
            <ProtectedContent>
              <div className="mt-2">{renderLessonMarkdown(correction)}</div>
            </ProtectedContent>
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
