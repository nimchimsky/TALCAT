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

export function PublicTestRunner(props: PublicTestRunnerProps) {
  const { attemptId, participantCode, participantName, items } = props;
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
    <div className="public-panel p-5 sm:p-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="eyebrow">En curs</p>
          <h2 className="font-display text-3xl text-[#18261e] sm:text-4xl">
            Respon i continua
          </h2>
          <p className="text-sm leading-6 text-[#55605a]">
            Codi:{" "}
            <span className="font-semibold text-[#18261e]">{participantCode}</span>
          </p>
          {participantName ? (
            <p className="text-sm leading-6 text-[#55605a]">
              Alias:{" "}
              <span className="font-semibold text-[#18261e]">
                {participantName}
              </span>
            </p>
          ) : null}
          <p className="text-sm leading-6 text-[#55605a]">
            Decideix rapidament si es una paraula catalana o no.
          </p>
        </div>
        <div className="min-w-[220px] rounded-[26px] bg-white/78 p-4">
          <div className="mb-2 flex items-center justify-between text-sm text-[#68716b]">
            <span>Progressio</span>
            <span>{progress}%</span>
          </div>
          <div className="h-3 rounded-full bg-[#d8ddd7]">
            <div
              className="h-3 rounded-full bg-[#295e4e] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {isComplete ? (
        <div className="space-y-5">
          <div className="rounded-[30px] bg-white/82 p-6">
            <h3 className="text-xl font-semibold text-[#18261e]">
              Ja has acabat
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#55605a]">
              Prem el boto final per guardar les respostes i veure el resultat.
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
            className="rounded-full bg-[#1d2e26] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#243830] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? "Guardant..." : "Finalitza i veu el resultat"}
          </button>
        </div>
      ) : currentItem ? (
        <div className="space-y-6">
          <div className="rounded-[34px] bg-white/82 p-8 text-center sm:p-12">
            <p className="mb-3 text-sm font-medium text-[#68716b]">
              Item {currentIndex + 1} de {items.length}
            </p>
            <p className="font-display text-5xl text-[#18261e] sm:text-6xl">
              {currentItem.prompt}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => registerAnswer(true)}
              className="answer-button bg-[#eef5ef] hover:border-[#4b8b70] hover:bg-[#e2efe5]"
            >
              <p className="text-lg font-semibold text-[#1d4f3d]">
                Es una paraula
              </p>
              <p className="mt-2 text-sm leading-6 text-[#396552]">
                Prem aqui si la reconeixes com a paraula catalana.
              </p>
            </button>

            <button
              type="button"
              onClick={() => registerAnswer(false)}
              className="answer-button bg-[#f4efe8] hover:border-[#8d7150] hover:bg-[#efe6db]"
            >
              <p className="text-lg font-semibold text-[#5f4a32]">
                No es una paraula
              </p>
              <p className="mt-2 text-sm leading-6 text-[#7d6447]">
                Prem aqui si et sembla inventada o incorrecta.
              </p>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
