"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type AdaptiveCurrentItem = {
  itemId: number;
  stableKey: string;
  prompt: string;
  itemType: "WORD" | "PSEUDOWORD";
  difficulty: number;
  discrimination: number;
  position: number;
  seedTag: "anchor_seed" | "adaptive" | "pseudo_control";
};

type AdaptiveSessionState = {
  attemptId: string;
  participantCode: string;
  participantName: string | null;
  totalAnswered: number;
  wordItems: number;
  pseudowordItems: number;
  currentTheta: number;
  currentSem: number | null;
  currentItem: AdaptiveCurrentItem | null;
  completed: boolean;
};

type AdaptiveTestRunnerProps = {
  attemptId: string;
  participantCode: string;
  participantName?: string | null;
};

export function AdaptiveTestRunner({
  attemptId,
  participantCode,
  participantName,
}: AdaptiveTestRunnerProps) {
  const router = useRouter();
  const [state, setState] = useState<AdaptiveSessionState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const startRef = useRef(0);
  const currentStableKey = state?.currentItem?.stableKey ?? null;

  useEffect(() => {
    let active = true;

    fetch(`/api/attempts/${attemptId}/state`)
      .then(async (response) => {
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(payload?.error ?? "No s'ha pogut carregar la sessio.");
        }

        return (await response.json()) as AdaptiveSessionState;
      })
      .then((payload) => {
        if (!active) {
          return;
        }
        setState(payload);
        startRef.current = Date.now();
      })
      .catch((caughtError) => {
        if (!active) {
          return;
        }
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "No s'ha pogut carregar la sessio.",
        );
      });

    return () => {
      active = false;
    };
  }, [attemptId]);

  useEffect(() => {
    if (currentStableKey) {
      startRef.current = Date.now();
    }
  }, [currentStableKey]);

  function handleAnswer(answerBoolean: boolean) {
    if (!state?.currentItem || isPending) {
      return;
    }

    startTransition(async () => {
      setError(null);
      const response = await fetch(`/api/attempts/${attemptId}/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answerBoolean,
          rtMs: Date.now() - startRef.current,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(payload?.error ?? "No s'ha pogut registrar la resposta.");
        return;
      }

      const payload = (await response.json()) as
        | {
            completed: false;
            state: AdaptiveSessionState;
          }
        | {
            completed: true;
            participantCode: string;
          };

      if (payload.completed) {
        router.push(`/resultats?codi=${payload.participantCode}`);
        return;
      }

      setState(payload.state);
    });
  }

  const currentItem = state?.currentItem ?? null;

  return (
    <div className="public-panel p-5 sm:p-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="eyebrow">Adaptatiu</p>
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
              <span className="font-semibold text-[#18261e]">{participantName}</span>
            </p>
          ) : null}
        </div>
        <div className="rounded-[26px] bg-white/78 p-4 text-sm text-[#55605a]">
          <p>
            Items respostos:{" "}
            <span className="font-semibold text-[#18261e]">
              {state?.totalAnswered ?? 0}
            </span>
          </p>
          <p className="mt-1">
            Paraules:{" "}
            <span className="font-semibold text-[#18261e]">
              {state?.wordItems ?? 0}
            </span>
            {" · "}
            No paraules:{" "}
            <span className="font-semibold text-[#18261e]">
              {state?.pseudowordItems ?? 0}
            </span>
          </p>
          {typeof state?.currentSem === "number" ? (
            <p className="mt-1">
              Precisio actual:{" "}
              <span className="font-semibold text-[#18261e]">
                SEM {state.currentSem.toFixed(2)}
              </span>
            </p>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="mb-5 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {!state ? (
        <div className="rounded-[30px] bg-white/82 p-8 text-center text-sm text-[#55605a]">
          Carregant la sessio...
        </div>
      ) : currentItem ? (
        <div className="space-y-6">
          <div className="rounded-[34px] bg-white/82 p-8 text-center sm:p-12">
            <p className="mb-3 text-sm font-medium text-[#68716b]">
              Item {currentItem.position}
            </p>
            <p className="font-display text-5xl text-[#18261e] sm:text-6xl">
              {currentItem.prompt}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleAnswer(true)}
              disabled={isPending}
              className="answer-button bg-[#eef5ef] hover:border-[#4b8b70] hover:bg-[#e2efe5] disabled:opacity-70"
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
              onClick={() => handleAnswer(false)}
              disabled={isPending}
              className="answer-button bg-[#f4efe8] hover:border-[#8d7150] hover:bg-[#efe6db] disabled:opacity-70"
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
      ) : (
        <div className="rounded-[30px] bg-white/82 p-8 text-center text-sm text-[#55605a]">
          Preparant el seguent item...
        </div>
      )}
    </div>
  );
}
