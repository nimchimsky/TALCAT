import { prisma } from "@/lib/prisma";

import {
  type AdaptivePseudoItem,
  type AdaptiveRuntimeBank,
  type AdaptiveWordItem,
  interpolateScaleScore,
  loadAdaptiveRuntimeBank,
} from "@/lib/adaptive-bank";

const ENGINE_VERSION = "pilot-cat-v1";
const MIN_ITEMS = 24;
const MAX_ITEMS = 60;
const TARGET_SEM = 0.32;
const MIN_PSEUDOWORDS = 6;
const RANDOMESQUE_TOP_N = 8;

type ItemKind = "WORD" | "PSEUDOWORD";

export type AdaptiveCurrentItem = {
  itemId: number;
  stableKey: string;
  prompt: string;
  itemType: ItemKind;
  difficulty: number;
  discrimination: number;
  position: number;
  seedTag: "anchor_seed" | "adaptive" | "pseudo_control";
};

export type AdaptiveTraceItem = {
  itemId: number;
  stableKey: string;
  prompt: string;
  itemType: ItemKind;
  difficulty: number;
  discrimination: number;
  position: number;
  seedTag: "anchor_seed" | "adaptive" | "pseudo_control";
  answerBoolean: boolean;
  isCorrect: boolean;
  rtMs: number;
  thetaAfterItem: number | null;
  semAfterItem: number | null;
};

export type AdaptiveEngineState = {
  version: 1;
  engineVersion: string;
  intake: {
    age?: number | null;
    selfReportedCatalan?: number | null;
    isNative?: boolean | null;
    previousTheta?: number | null;
  };
  startTheta: number;
  currentTheta: number;
  currentSem: number | null;
  position: number;
  wordTrace: AdaptiveTraceItem[];
  pseudowordTrace: AdaptiveTraceItem[];
  currentItem: AdaptiveCurrentItem | null;
  stopReason: "target_sem" | "max_items" | "completed" | null;
  completed: boolean;
};

export type AdaptiveSessionState = {
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

export type AdaptiveAnswerResult =
  | {
      completed: false;
      state: AdaptiveSessionState;
    }
  | {
      completed: true;
      participantCode: string;
    };

function sigmoid(value: number) {
  const clipped = Math.max(-20, Math.min(20, value));
  return 1 / (1 + Math.exp(-clipped));
}

function fisherInformation(theta: number, difficulty: number, discrimination: number) {
  const probability = sigmoid(discrimination * (theta - difficulty));
  return (discrimination ** 2) * probability * (1 - probability);
}

function sampleWeighted<T extends { score: number }>(rows: T[]) {
  const total = rows.reduce((sum, row) => sum + Math.max(row.score, 0), 0);
  if (total <= 0) {
    return rows[0] ?? null;
  }

  let threshold = Math.random() * total;
  for (const row of rows) {
    threshold -= Math.max(row.score, 0);
    if (threshold <= 0) {
      return row;
    }
  }

  return rows[rows.length - 1] ?? null;
}

function chooseStartTheta(intake: AdaptiveEngineState["intake"]) {
  if (typeof intake.previousTheta === "number" && Number.isFinite(intake.previousTheta)) {
    return Math.max(-3, Math.min(3, intake.previousTheta));
  }
  if (typeof intake.age === "number" && intake.age <= 17) {
    return -1.0;
  }
  if (
    (typeof intake.selfReportedCatalan === "number" && intake.selfReportedCatalan <= 5) ||
    intake.isNative === false
  ) {
    return -1.25;
  }
  return -0.5;
}

function estimateMapTheta(
  trace: AdaptiveTraceItem[],
  startTheta: number,
) {
  if (trace.length === 0) {
    return {
      theta: startTheta,
      sem: null,
    };
  }

  let theta = startTheta;
  const priorVariance = 1;

  for (let index = 0; index < 6; index += 1) {
    let score = -((theta - startTheta) / priorVariance);
    let information = 1 / priorVariance;

    for (const item of trace) {
      const probability = sigmoid(item.discrimination * (theta - item.difficulty));
      score += item.discrimination * ((item.answerBoolean ? 1 : 0) - probability);
      information += (item.discrimination ** 2) * probability * (1 - probability);
    }

    if (information <= 1e-6) {
      break;
    }

    const thetaNext = Math.max(-3.5, Math.min(3.5, theta + score / information));
    if (Math.abs(thetaNext - theta) < 1e-3) {
      theta = thetaNext;
      break;
    }
    theta = thetaNext;
  }

  let information = 1 / priorVariance;
  for (const item of trace) {
    const probability = sigmoid(item.discrimination * (theta - item.difficulty));
    information += (item.discrimination ** 2) * probability * (1 - probability);
  }

  return {
    theta,
    sem: 1 / Math.sqrt(Math.max(information, 1e-6)),
  };
}

let cachedExposureMap:
  | {
      expiresAt: number;
      values: Map<string, number>;
    }
  | null = null;

async function getExposureMap() {
  if (cachedExposureMap && cachedExposureMap.expiresAt > Date.now()) {
    return cachedExposureMap.values;
  }

  const grouped = await prisma.response.groupBy({
    by: ["itemId"],
    _count: {
      itemId: true,
    },
  });

  const ids = grouped.map((row) => row.itemId);
  const items = ids.length
    ? await prisma.itemBankEntry.findMany({
        where: {
          id: {
            in: ids,
          },
        },
        select: {
          id: true,
          stableKey: true,
        },
      })
    : [];

  const stableKeyById = new Map(items.map((item) => [item.id, item.stableKey]));
  const values = new Map<string, number>();

  for (const row of grouped) {
    const stableKey = stableKeyById.get(row.itemId);
    if (!stableKey) {
      continue;
    }
    values.set(stableKey, row._count.itemId);
  }

  cachedExposureMap = {
    expiresAt: Date.now() + 5_000,
    values,
  };

  return values;
}

function getUsedStableKeys(state: AdaptiveEngineState) {
  const used = new Set<string>();
  for (const item of state.wordTrace) {
    used.add(item.stableKey);
  }
  for (const item of state.pseudowordTrace) {
    used.add(item.stableKey);
  }
  if (state.currentItem) {
    used.add(state.currentItem.stableKey);
  }
  return used;
}

function shouldServePseudoword(state: AdaptiveEngineState) {
  const totalAnswered = state.wordTrace.length + state.pseudowordTrace.length;
  if (state.pseudowordTrace.length >= MIN_PSEUDOWORDS) {
    return false;
  }
  return totalAnswered >= state.pseudowordTrace.length + 4;
}

function rankSeedWords(
  words: AdaptiveWordItem[],
  usedStableKeys: Set<string>,
  state: AdaptiveEngineState,
) {
  const preferLow = state.startTheta <= -0.9;
  return words
    .filter((item) => item.anchorEligible && !usedStableKeys.has(item.stableKey))
    .filter((item) => !preferLow || item.lowEndPriority)
    .map((item) => ({
      item,
      score: 1 / (1 + Math.abs(item.difficulty - state.startTheta)),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, RANDOMESQUE_TOP_N);
}

function rankAdaptiveWords(
  words: AdaptiveWordItem[],
  usedStableKeys: Set<string>,
  state: AdaptiveEngineState,
  exposureMap: Map<string, number>,
) {
  const theta = state.currentTheta;
  const earlyLowEndBoost = theta <= -0.75 && state.wordTrace.length < 12;

  return words
    .filter((item) => !usedStableKeys.has(item.stableKey))
    .map((item) => {
      const information = fisherInformation(theta, item.difficulty, item.discrimination);
      const exposureCount = exposureMap.get(item.stableKey) ?? 0;
      const exposurePenalty = 1 / (1 + exposureCount * 0.03);
      const lowEndBoost = earlyLowEndBoost && item.lowEndPriority ? 1.25 : 1;
      const reservePenalty = item.securityReserve ? 0.9 : 1;

      return {
        item,
        score: information * exposurePenalty * lowEndBoost * reservePenalty,
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, RANDOMESQUE_TOP_N);
}

function rankPseudowords(
  pseudowords: AdaptivePseudoItem[],
  usedStableKeys: Set<string>,
  state: AdaptiveEngineState,
  exposureMap: Map<string, number>,
) {
  const theta = state.currentTheta;
  return pseudowords
    .filter((item) => !usedStableKeys.has(item.stableKey))
    .map((item) => {
      const distance = Math.abs(item.difficulty - theta);
      const exposureCount = exposureMap.get(item.stableKey) ?? 0;
      const exposurePenalty = 1 / (1 + exposureCount * 0.03);
      const lowEndBoost = theta <= -0.75 && item.lowEndPriority ? 1.2 : 1;

      return {
        item,
        score: (1 / (1 + distance)) * exposurePenalty * lowEndBoost,
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, RANDOMESQUE_TOP_N);
}

async function chooseNextItem(
  bank: AdaptiveRuntimeBank,
  state: AdaptiveEngineState,
) {
  const usedStableKeys = getUsedStableKeys(state);
  const exposureMap = await getExposureMap();
  const totalAnswered = state.wordTrace.length + state.pseudowordTrace.length;

  if (
    totalAnswered >= MAX_ITEMS ||
    (totalAnswered >= MIN_ITEMS &&
      state.pseudowordTrace.length >= MIN_PSEUDOWORDS &&
      typeof state.currentSem === "number" &&
      state.currentSem <= TARGET_SEM)
  ) {
    return null;
  }

  if (state.wordTrace.length < 4) {
    const seeded = sampleWeighted(rankSeedWords(bank.words, usedStableKeys, state));
    if (seeded) {
      return {
        itemId: seeded.item.itemId,
        stableKey: seeded.item.stableKey,
        prompt: seeded.item.prompt,
        itemType: "WORD" as const,
        difficulty: seeded.item.difficulty,
        discrimination: seeded.item.discrimination,
        position: totalAnswered + 1,
        seedTag: "anchor_seed" as const,
      };
    }
  }

  if (shouldServePseudoword(state)) {
    const pseudo = sampleWeighted(
      rankPseudowords(bank.pseudowords, usedStableKeys, state, exposureMap),
    );
    if (pseudo) {
      return {
        itemId: pseudo.item.itemId,
        stableKey: pseudo.item.stableKey,
        prompt: pseudo.item.prompt,
        itemType: "PSEUDOWORD" as const,
        difficulty: pseudo.item.difficulty,
        discrimination: 1,
        position: totalAnswered + 1,
        seedTag: "pseudo_control" as const,
      };
    }
  }

  const adaptive = sampleWeighted(
    rankAdaptiveWords(bank.words, usedStableKeys, state, exposureMap),
  );
  if (!adaptive) {
    return null;
  }

  return {
    itemId: adaptive.item.itemId,
    stableKey: adaptive.item.stableKey,
    prompt: adaptive.item.prompt,
    itemType: "WORD" as const,
    difficulty: adaptive.item.difficulty,
    discrimination: adaptive.item.discrimination,
    position: totalAnswered + 1,
    seedTag: "adaptive" as const,
  };
}

function finalizeAdaptiveState(
  bank: AdaptiveRuntimeBank,
  state: AdaptiveEngineState,
) {
  const wordCorrect = state.wordTrace.filter((item) => item.answerBoolean).length;
  const pseudoFalseAlarms = state.pseudowordTrace.filter((item) => item.answerBoolean).length;
  const wordTotal = state.wordTrace.length;
  const pseudoTotal = state.pseudowordTrace.length;
  const accuracy =
    [...state.wordTrace, ...state.pseudowordTrace].filter((item) => item.isCorrect).length /
    Math.max(1, wordTotal + pseudoTotal);
  const scaleScore = interpolateScaleScore(state.currentTheta, bank.scaleTable);

  const hitRate = Math.min(0.999, Math.max(0.001, wordCorrect / Math.max(1, wordTotal)));
  const falseAlarmRate = Math.min(
    0.999,
    Math.max(0.001, pseudoFalseAlarms / Math.max(1, pseudoTotal)),
  );
  const z = (p: number) => {
    const a1 = -39.69683028665376;
    const a2 = 220.9460984245205;
    const a3 = -275.9285104469687;
    const a4 = 138.357751867269;
    const a5 = -30.66479806614716;
    const a6 = 2.506628277459239;
    const b1 = -54.47609879822406;
    const b2 = 161.5858368580409;
    const b3 = -155.6989798598866;
    const b4 = 66.80131188771972;
    const b5 = -13.28068155288572;
    const c1 = -0.007784894002430293;
    const c2 = -0.3223964580411365;
    const c3 = -2.400758277161838;
    const c4 = -2.549732539343734;
    const c5 = 4.374664141464968;
    const c6 = 2.938163982698783;
    const d1 = 0.007784695709041462;
    const d2 = 0.3224671290700398;
    const d3 = 2.445134137142996;
    const d4 = 3.754408661907416;
    const plow = 0.02425;
    const phigh = 1 - plow;

    if (p < plow) {
      const q = Math.sqrt(-2 * Math.log(p));
      return (
        (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
        ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
      );
    }
    if (p > phigh) {
      const q = Math.sqrt(-2 * Math.log(1 - p));
      return -(
        (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
        ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
      );
    }
    const q = p - 0.5;
    const r = q * q;
    return (
      (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
      (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1)
    );
  };
  const dPrime = z(hitRate) - z(falseAlarmRate);
  const criterionC = -0.5 * (z(hitRate) + z(falseAlarmRate));

  return {
    accuracy,
    scaleScore,
    dPrime,
    criterionC,
  };
}

export async function createInitialAdaptiveState(intake: AdaptiveEngineState["intake"]) {
  const bank = await loadAdaptiveRuntimeBank();
  const startTheta = chooseStartTheta(intake);
  const state: AdaptiveEngineState = {
    version: 1,
    engineVersion: ENGINE_VERSION,
    intake,
    startTheta,
    currentTheta: startTheta,
    currentSem: null,
    position: 0,
    wordTrace: [],
    pseudowordTrace: [],
    currentItem: null,
    stopReason: null,
    completed: false,
  };

  state.currentItem = await chooseNextItem(bank, state);
  return state;
}

export async function getAdaptiveSessionStateFromAttempt(attempt: {
  id: string;
  participant: { publicCode: string; fullName: string | null };
  engineState: unknown;
}) {
  const state = attempt.engineState as AdaptiveEngineState | null;
  if (!state) {
    throw new Error("No s'ha trobat l'estat adaptatiu de la sessio.");
  }

  return {
    attemptId: attempt.id,
    participantCode: attempt.participant.publicCode,
    participantName: attempt.participant.fullName,
    totalAnswered: state.wordTrace.length + state.pseudowordTrace.length,
    wordItems: state.wordTrace.length,
    pseudowordItems: state.pseudowordTrace.length,
    currentTheta: state.currentTheta,
    currentSem: state.currentSem,
    currentItem: state.currentItem,
    completed: state.completed,
  } satisfies AdaptiveSessionState;
}

export async function applyAdaptiveAnswer(
  state: AdaptiveEngineState,
  answerBoolean: boolean,
  rtMs: number,
) {
  if (!state.currentItem || state.completed) {
    throw new Error("No hi ha cap item adaptatiu pendent.");
  }

  const bank = await loadAdaptiveRuntimeBank();
  const current = state.currentItem;
  const isCorrect =
    current.itemType === "WORD" ? answerBoolean : !answerBoolean;

  const traceItem: AdaptiveTraceItem = {
    ...current,
    answerBoolean,
    isCorrect,
    rtMs: Math.max(0, Math.round(rtMs)),
    thetaAfterItem: null,
    semAfterItem: null,
  };

  if (current.itemType === "WORD") {
    const nextWordTrace = [...state.wordTrace, traceItem];
    const { theta, sem } = estimateMapTheta(nextWordTrace, state.startTheta);
    traceItem.thetaAfterItem = theta;
    traceItem.semAfterItem = sem;
    state.wordTrace = nextWordTrace;
    state.currentTheta = theta;
    state.currentSem = sem;
  } else {
    traceItem.thetaAfterItem = state.currentTheta;
    traceItem.semAfterItem = state.currentSem;
    state.pseudowordTrace = [...state.pseudowordTrace, traceItem];
  }

  state.position += 1;
  state.currentItem = await chooseNextItem(bank, state);

  if (!state.currentItem) {
    state.completed = true;
    state.stopReason =
      state.wordTrace.length + state.pseudowordTrace.length >= MAX_ITEMS
        ? "max_items"
        : "target_sem";
  }

  return state;
}

export async function finalizeAdaptiveAttemptState(state: AdaptiveEngineState) {
  const bank = await loadAdaptiveRuntimeBank();
  return finalizeAdaptiveState(bank, state);
}
