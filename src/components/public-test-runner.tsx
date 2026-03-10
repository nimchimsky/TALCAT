"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type RunnerItem = {
  itemId: string;
  prompt: string;
  position: number;
  itemType: "WORD" | "PSEUDOWORD" | "QUESTION";
};

type PublicTestRunnerProps = {
  attemptId: string;
  participantCode: string;
  participantName?: string | null;
  testName: string;
  formLabel: string;
  items: RunnerItem[];
};

export function PublicTestRunner({
  attemptId,
  participantCode,
  participantName,
  testName,
  formLabel,
  items,
}: PublicTestRunnerProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<
    Array<{
      itemId: string;
      position: number;
      answerBoolean: boolean;
      rtMs: number;
    }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const startRef = useRef(0);

  useEffect(() => {
    startRef.current = Date.now();
  }, [currentIndex]);

  const currentItem = items[currentIndex];
  const progress = Math.round((responses.length / items.length) * 100);
  const isComplete = responses.length === items.length;

  function registerAnswer(answerBoolean: boolean) {
    if (!currentItem || isPending) {
      return;
    }

    const rtMs = Date.now() - startRef.current;
    const nextResponse = {
      itemId: currentItem.itemId,
      position: currentItem.position,
      answerBoolean,
      rtMs,
    };

    setResponses((previous) => [...previous, nextResponse]);
    setError(null);

    if (currentIndex < items.length - 1) {
      setCurrentIndex((value) => value + 1);
    }
  }

  function handleSubmit() {
    startTransition(async () => {
      setError(null);

      const response = await fetch(`/api/attempts/${attemptId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ responses }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(payload?.error ?? "No s'ha pogut tancar la prova.");
        return;
      }

      const payload = (await response.json()) as { participantCode: string };
      router.push(`/resultats?codi=${payload.participantCode}`);
    });
  }

  return (
    <div className="card-surface p-6 sm:p-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="eyebrow">{testName}</p>
          <h2 className="font-display text-3xl text-slate-950">{formLabel}</h2>
          <p className="text-sm leading-6 text-slate-600">
            Codi de participant:{" "}
            <span className="font-semibold text-slate-950">{participantCode}</span>
          </p>
          {participantName ? (
            <p className="text-sm leading-6 text-slate-600">
              Alias registrat:{" "}
              <span className="font-semibold text-slate-950">
                {participantName}
              </span>
            </p>
          ) : null}
        </div>
        <div className="min-w-[220px] rounded-[24px] bg-white/75 p-4">
          <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
            <span>Progressio</span>
            <span>{progress}%</span>
          </div>
          <div className="h-3 rounded-full bg-slate-200">
            <div
              className="h-3 rounded-full bg-emerald-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {isComplete ? (
        <div className="space-y-5">
          <div className="rounded-[28px] bg-white/80 p-6">
            <h3 className="text-xl font-semibold text-slate-950">
              Ja has respost tots els items
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Quan premis el boto final, guardarem les respostes i et portarem a
              la pantalla de resultat.
            </p>
          </div>
          {error ? (
            <p className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? "Guardant..." : "Finalitza i veu el resultat"}
          </button>
        </div>
      ) : currentItem ? (
        <div className="space-y-6">
          <div className="rounded-[32px] bg-white/80 p-8 text-center">
            <p className="mb-3 text-sm font-medium text-slate-500">
              Item {currentIndex + 1} de {items.length}
            </p>
            <p className="font-display text-5xl text-slate-950">
              {currentItem.prompt}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => registerAnswer(true)}
              className="rounded-[28px] border border-emerald-300 bg-emerald-50 px-6 py-6 text-left transition hover:border-emerald-500 hover:bg-emerald-100"
            >
              <p className="text-lg font-semibold text-emerald-900">
                Es una paraula
              </p>
              <p className="mt-2 text-sm leading-6 text-emerald-800">
                Selecciona aquesta opcio si reconeixes l&apos;item com a paraula
                valida en catala.
              </p>
            </button>

            <button
              type="button"
              onClick={() => registerAnswer(false)}
              className="rounded-[28px] border border-slate-300 bg-slate-50 px-6 py-6 text-left transition hover:border-slate-500 hover:bg-slate-100"
            >
              <p className="text-lg font-semibold text-slate-900">
                No es una paraula
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Tria aquesta resposta si et sembla una pseudoparaula o una forma
                incorrecta.
              </p>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
