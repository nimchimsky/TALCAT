import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

type RuntimeWord = {
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

type RuntimePseudo = {
  itemId: number;
  stableKey: string;
  prompt: string;
  difficulty: number;
  lowEndPriority: boolean;
  anchorEligible: boolean;
  securityReserve: boolean;
  difficultyZone: string | null;
};

type ScalePoint = {
  theta: number;
  scaleScore: number;
  conditionalSe: number;
};

function projectRoot() {
  return process.cwd();
}

function resolveWorkspaceDataDir(segment: string) {
  const localDir = path.join(projectRoot(), "data", segment);
  if (existsSync(localDir)) {
    return localDir;
  }

  return path.resolve(projectRoot(), "..", "data", segment);
}

function normalizeValue(value: unknown) {
  if (typeof value === "bigint") {
    return Number(value);
  }

  return value;
}

function asNumber(value: unknown) {
  const normalized = normalizeValue(value);
  if (typeof normalized === "number") {
    return normalized;
  }
  if (typeof normalized === "string" && normalized.length > 0) {
    return Number(normalized);
  }
  return Number.NaN;
}

function asBoolean(value: unknown) {
  const normalized = normalizeValue(value);
  if (typeof normalized === "boolean") {
    return normalized;
  }
  if (typeof normalized === "number") {
    return normalized !== 0;
  }
  if (typeof normalized === "string") {
    return ["true", "1", "yes"].includes(normalized.toLowerCase());
  }
  return false;
}

function asString(value: unknown) {
  const normalized = normalizeValue(value);
  if (normalized === null || normalized === undefined) {
    return null;
  }
  return String(normalized);
}

async function readParquetRows(filePath: string) {
  const { asyncBufferFromFile, parquetReadObjects } = await import("hyparquet");
  const { compressors } = await import("hyparquet-compressors");
  const file = await asyncBufferFromFile(filePath);
  return parquetReadObjects({ file, compressors, rowFormat: "object" });
}

async function main() {
  const root = projectRoot();
  const pilotDir = path.join(root, "data", "pilot");
  const adaptiveDir = resolveWorkspaceDataDir("adaptive");
  const scalesDir = resolveWorkspaceDataDir("scales");

  const [wordRows, bankRows, scaleRows] = await Promise.all([
    readParquetRows(path.join(adaptiveDir, "word_item_parameters_cat.parquet")),
    readParquetRows(path.join(adaptiveDir, "item_bank_adaptive.parquet")),
    readParquetRows(path.join(scalesDir, "adaptive_scale_table.parquet")),
  ]);

  const wordParams = new Map<number, { difficulty: number; discrimination: number }>();
  for (const row of wordRows) {
    const itemId = asNumber(row.item_id);
    const difficulty = asNumber(row.selected_difficulty);
    const discrimination = asNumber(row.selected_discrimination);
    if (!Number.isFinite(itemId) || !Number.isFinite(difficulty) || !Number.isFinite(discrimination)) {
      continue;
    }
    wordParams.set(itemId, {
      difficulty,
      discrimination,
    });
  }

  const words: RuntimeWord[] = [];
  const pseudowords: RuntimePseudo[] = [];

  for (const row of bankRows) {
    const itemId = asNumber(row.item_id);
    if (!Number.isFinite(itemId) || !asBoolean(row.adaptive_eligible)) {
      continue;
    }

    const prompt = asString(row.spelling_clean) || asString(row.spelling_raw);
    if (!prompt) {
      continue;
    }

    const lowEndPriority = asBoolean(row.low_end_priority);
    const anchorEligible = asBoolean(row.anchor_eligible);
    const securityReserve = asBoolean(row.security_reserve);
    const difficultyZone = asString(row.difficulty_zone);
    const stableKey = `talcat-${itemId}`;

    if (asBoolean(row.is_word)) {
      const params = wordParams.get(itemId);
      if (!params) {
        continue;
      }
      words.push({
        itemId,
        stableKey,
        prompt,
        difficulty: params.difficulty,
        discrimination: params.discrimination,
        lowEndPriority,
        anchorEligible,
        securityReserve,
        difficultyZone,
      });
      continue;
    }

    const difficulty = asNumber(row.difficulty_baseline);
    if (!Number.isFinite(difficulty)) {
      continue;
    }
    pseudowords.push({
      itemId,
      stableKey,
      prompt,
      difficulty,
      lowEndPriority,
      anchorEligible,
      securityReserve,
      difficultyZone,
    });
  }

  words.sort((left, right) => left.itemId - right.itemId);
  pseudowords.sort((left, right) => left.itemId - right.itemId);

  const scaleTable: ScalePoint[] = scaleRows
    .map((row) => ({
      theta: asNumber(row.theta),
      scaleScore: asNumber(row.scale_score),
      conditionalSe: asNumber(row.conditional_se),
    }))
    .filter(
      (row) =>
        Number.isFinite(row.theta) &&
        Number.isFinite(row.scaleScore) &&
        Number.isFinite(row.conditionalSe),
    )
    .sort((left, right) => left.theta - right.theta);

  const payload = {
    generatedAt: new Date().toISOString(),
    counts: {
      words: words.length,
      pseudowords: pseudowords.length,
      scalePoints: scaleTable.length,
    },
    words,
    pseudowords,
    scaleTable,
  };

  await mkdir(pilotDir, { recursive: true });
  await writeFile(
    path.join(pilotDir, "adaptive_runtime_bank.json"),
    JSON.stringify(payload),
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        output: path.join(pilotDir, "adaptive_runtime_bank.json"),
        counts: payload.counts,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
