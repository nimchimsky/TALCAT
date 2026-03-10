import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

export type AdaptiveWordItem = {
  itemId: number;
  stableKey: string;
  prompt: string;
  difficulty: number;
  discrimination: number;
  lowEndPriority: boolean;
  anchorEligible: boolean;
  securityReserve: boolean;
  difficultyZone: string | null;
};

export type AdaptivePseudoItem = {
  itemId: number;
  stableKey: string;
  prompt: string;
  difficulty: number;
  lowEndPriority: boolean;
  anchorEligible: boolean;
  securityReserve: boolean;
  difficultyZone: string | null;
};

export type AdaptiveScalePoint = {
  theta: number;
  scaleScore: number;
  conditionalSe: number;
};

export type AdaptiveRuntimeBank = {
  generatedAt: string;
  counts: {
    words: number;
    pseudowords: number;
    scalePoints: number;
  };
  words: AdaptiveWordItem[];
  pseudowords: AdaptivePseudoItem[];
  scaleTable: AdaptiveScalePoint[];
};

let cachedBank: Promise<AdaptiveRuntimeBank> | null = null;

function getRuntimeBankPath() {
  const localPath = path.join(process.cwd(), "data", "pilot", "adaptive_runtime_bank.json");
  if (existsSync(localPath)) {
    return localPath;
  }

  return path.resolve(process.cwd(), "..", "data", "pilot", "adaptive_runtime_bank.json");
}

export async function loadAdaptiveRuntimeBank() {
  if (!cachedBank) {
    cachedBank = readFile(getRuntimeBankPath(), "utf8").then((content) =>
      JSON.parse(content) as AdaptiveRuntimeBank,
    );
  }

  return cachedBank;
}

export async function getAdaptiveRuntimeSummary() {
  const bank = await loadAdaptiveRuntimeBank();
  return bank.counts;
}

export function interpolateScaleScore(
  theta: number,
  scaleTable: AdaptiveScalePoint[],
) {
  if (scaleTable.length === 0) {
    return Math.round(theta * 100);
  }

  if (theta <= scaleTable[0]!.theta) {
    return Math.round(scaleTable[0]!.scaleScore);
  }

  const last = scaleTable[scaleTable.length - 1]!;
  if (theta >= last.theta) {
    return Math.round(last.scaleScore);
  }

  for (let index = 1; index < scaleTable.length; index += 1) {
    const left = scaleTable[index - 1]!;
    const right = scaleTable[index]!;

    if (theta <= right.theta) {
      const ratio = (theta - left.theta) / (right.theta - left.theta);
      return Math.round(left.scaleScore + ratio * (right.scaleScore - left.scaleScore));
    }
  }

  return Math.round(last.scaleScore);
}
