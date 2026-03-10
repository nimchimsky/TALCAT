import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { ItemType, PrismaClient, TestStatus } from "@prisma/client";

const prisma = new PrismaClient();

type LegacyCatalogRow = {
  formVersion: string;
  itemOrder: number;
  section: string;
  itemId: string;
  spellingRaw: string;
  spellingClean: string;
};

type PilotFormCatalog = {
  adaptive_main?: {
    code: string;
    label: string;
    delivery_mode: string;
    description: string;
  };
  forms: Array<{
    code: string;
    label: string;
    block_role: string;
    delivery_mode: string;
    target_population: string;
    estimated_minutes: number;
    time_limit_sec: number;
    is_primary: boolean;
    item_count: number;
    word_count: number;
    pseudoword_count: number;
    items: Array<{
      item_order: number;
      section: string;
      item_id: number;
      spelling_raw: string | null;
      spelling_clean: string | null;
      block_label: string | null;
      is_anchor: boolean;
    }>;
  }>;
};

type PilotCatalog = {
  pilot_objective: string;
  preferred_model: string;
  preferred_model_reason: string;
  delivery_default: string;
  delivery_fallback: string;
};

function repairMojibake(value: string) {
  if (!value) {
    return value;
  }

  if (value.includes("Ãƒ") || value.includes("Ã‚")) {
    return Buffer.from(value, "latin1").toString("utf8");
  }

  return value;
}

function parseCsv(content: string) {
  return content
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .filter(Boolean)
    .map((line) => {
      const [formVersion, itemOrder, section, itemId, spellingRaw, spellingClean] =
        line.split(",");

      return {
        formVersion,
        itemOrder: Number(itemOrder),
        section,
        itemId,
        spellingRaw: repairMojibake(spellingRaw),
        spellingClean: repairMojibake(spellingClean),
      } satisfies LegacyCatalogRow;
    });
}

function parseReleaseMetrics(markdown: string) {
  const metrics = Object.fromEntries(
    [...markdown.matchAll(/\* ([^:]+): `([^`]+)`/g)].map((match) => [
      match[1].trim(),
      match[2].trim(),
    ]),
  );

  const sizes = Object.fromEntries(
    [...markdown.matchAll(/\* (V\d total items): `([^`]+)`/g)].map((match) => [
      match[1].trim(),
      Number(match[2]),
    ]),
  );

  return { metrics, sizes };
}

function resolveWorkspaceDir(segment: string) {
  const localDir = path.join(process.cwd(), segment);
  if (existsSync(localDir)) {
    return localDir;
  }

  return path.resolve(process.cwd(), "..", segment);
}

function getDataPaths() {
  const formsDir = process.env.TALCAT_DATA_DIR ?? resolveWorkspaceDir(path.join("data", "forms"));
  const reportsDir = resolveWorkspaceDir("reports");
  const pilotDir = resolveWorkspaceDir(path.join("data", "pilot"));

  return {
    v1Path: path.join(formsDir, "short_form_v1_items.csv"),
    v2Path: path.join(formsDir, "short_form_v2_items.csv"),
    reportPath: process.env.TALCAT_RELEASE_SUMMARY_PATH ?? path.join(reportsDir, "release_v1_summary.md"),
    pilotCatalogPath: path.join(pilotDir, "pilot_catalog.json"),
    pilotFormCatalogPath: path.join(pilotDir, "pilot_form_catalog.json"),
  };
}

async function readJsonIfExists<T>(filePath: string) {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

async function ensureOrganization() {
  const existing = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (existing) {
    return prisma.organization.update({
      where: { id: existing.id },
      data: {
        name: "TALCAT",
        slug: "talcat",
      },
    });
  }

  return prisma.organization.create({
    data: {
      name: "TALCAT",
      slug: "talcat",
      adminUsers: {
        create: [
          {
            name: "NimChimsky",
            email: "rogerbn@hotmail.com",
            role: "OWNER",
            authProvider: "github",
          },
        ],
      },
    },
  });
}

async function clearOperationalCatalog() {
  await prisma.response.deleteMany();
  await prisma.attempt.deleteMany();
  await prisma.session.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.formItem.deleteMany();
  await prisma.form.deleteMany();
  await prisma.test.deleteMany();
  await prisma.itemBankEntry.deleteMany();
  await prisma.auditLog.deleteMany();
}

function getPilotTestDescription(pilotCatalog: PilotCatalog) {
  return `Pilot operatiu TALCAT amb mode adaptatiu previst, blocs d'ancoratge i fallback fix. Model preferit actual: ${pilotCatalog.preferred_model}.`;
}

function getLegacyTestDescription() {
  return "Cataleg operatiu provisional importat des de short_form_v1_items.csv i short_form_v2_items.csv.";
}

async function upsertItem(
  itemCache: Map<string, { id: string }>,
  itemId: string | number,
  section: string,
  spellingRaw: string | null,
  spellingClean: string | null,
) {
  const stableKey = `talcat-${itemId}`;
  let item = itemCache.get(stableKey);

  if (!item) {
    item = await prisma.itemBankEntry.create({
      data: {
        stableKey,
        prompt: spellingClean || spellingRaw || stableKey,
        itemType: section === "pseudoword" ? ItemType.PSEUDOWORD : ItemType.WORD,
      },
      select: { id: true },
    });

    itemCache.set(stableKey, item);
  }

  return item;
}

async function importPilotCatalog(
  organizationId: string,
  pilotCatalog: PilotCatalog,
  formCatalog: PilotFormCatalog,
) {
  const test = await prisma.test.create({
    data: {
      organizationId,
      slug: "talcat-adaptive-pilot",
      name: "TALCAT Adaptive Pilot",
      description: getPilotTestDescription(pilotCatalog),
      status: TestStatus.ACTIVE,
      deliveryMode: `${pilotCatalog.delivery_default}-with-${pilotCatalog.delivery_fallback}`,
      scoreModel: pilotCatalog.preferred_model,
      estimatedMinutes: 8,
    },
  });

  const itemCache = new Map<string, { id: string }>();

  if (formCatalog.adaptive_main) {
    await prisma.form.create({
      data: {
        testId: test.id,
        code: formCatalog.adaptive_main.code,
        version: 1,
        label: formCatalog.adaptive_main.label,
        isPrimary: true,
        deliveryMode: formCatalog.adaptive_main.delivery_mode,
        itemCount: 0,
        wordCount: 0,
        pseudowordCount: 0,
        timeLimitSec: 480,
      },
    });
  }

  for (const formEntry of formCatalog.forms) {
    const form = await prisma.form.create({
      data: {
        testId: test.id,
        code: formEntry.code,
        version: 1,
        label: formEntry.label,
        isPrimary: false,
        deliveryMode: formEntry.delivery_mode,
        itemCount: formEntry.item_count,
        wordCount: formEntry.word_count,
        pseudowordCount: formEntry.pseudoword_count,
        timeLimitSec: formEntry.time_limit_sec,
      },
    });

    for (const itemEntry of [...formEntry.items].sort(
      (left, right) => left.item_order - right.item_order,
    )) {
      const item = await upsertItem(
        itemCache,
        itemEntry.item_id,
        itemEntry.section,
        itemEntry.spelling_raw,
        itemEntry.spelling_clean,
      );

      await prisma.formItem.create({
        data: {
          formId: form.id,
          itemId: item.id,
          position: itemEntry.item_order,
          blockLabel: itemEntry.block_label ?? formEntry.block_role,
          isAnchor: itemEntry.is_anchor,
        },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      organizationId,
      actorEmail: "rogerbn@hotmail.com",
      action: "catalog.imported",
      entityType: "Test",
      entityId: test.id,
      summary:
        "Importat el paquet de pilot adaptatiu TALCAT amb blocs d'ancoratge i fallback fix.",
      metadata: {
        pilotObjective: pilotCatalog.pilot_objective,
        adaptiveMain: formCatalog.adaptive_main ?? null,
        forms: formCatalog.forms.map((entry) => ({
          code: entry.code,
          blockRole: entry.block_role,
          deliveryMode: entry.delivery_mode,
          itemCount: entry.item_count,
        })),
      },
    },
  });

  console.log(
    JSON.stringify(
      {
        test: test.name,
        importedMode: "pilot_package",
        forms: formCatalog.forms.map((entry) => entry.code),
        uniqueItems: itemCache.size,
      },
      null,
      2,
    ),
  );
}

async function importLegacyCatalog(
  organizationId: string,
  v1Csv: string,
  v2Csv: string,
  releaseSummary: string,
) {
  const rows = [...parseCsv(v1Csv), ...parseCsv(v2Csv)];
  const { metrics, sizes } = parseReleaseMetrics(releaseSummary);

  const test = await prisma.test.create({
    data: {
      organizationId,
      slug: "talcat-release-v1",
      name: "TALCAT Release V1",
      description: getLegacyTestDescription(),
      status: TestStatus.ACTIVE,
      deliveryMode: "mobile-first",
      scoreModel: "word-primary",
      estimatedMinutes: 8,
    },
  });

  const itemCache = new Map<string, { id: string }>();
  const groupedForms = new Map<string, LegacyCatalogRow[]>();

  for (const row of rows) {
    const bucket = groupedForms.get(row.formVersion) ?? [];
    bucket.push(row);
    groupedForms.set(row.formVersion, bucket);
  }

  for (const [formVersion, formRows] of [...groupedForms.entries()].sort()) {
    const versionNumber = Number(formVersion.replace(/[^\d]/g, "")) || 1;
    const wordCount = formRows.filter((row) => row.section === "word").length;
    const pseudowordCount = formRows.filter((row) => row.section === "pseudoword").length;

    const form = await prisma.form.create({
      data: {
        testId: test.id,
        code: `TALCAT-${formVersion.toUpperCase()}`,
        version: versionNumber,
        label: `Forma ${formVersion.toUpperCase()}`,
        isPrimary: formVersion === "v1",
        deliveryMode: "fixed_fallback",
        itemCount: formRows.length,
        wordCount,
        pseudowordCount,
        timeLimitSec: 480,
      },
    });

    for (const row of formRows.sort((a, b) => a.itemOrder - b.itemOrder)) {
      const item = await upsertItem(
        itemCache,
        row.itemId,
        row.section,
        row.spellingRaw,
        row.spellingClean,
      );

      await prisma.formItem.create({
        data: {
          formId: form.id,
          itemId: item.id,
          position: row.itemOrder,
          blockLabel: row.section,
        },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      organizationId,
      actorEmail: "rogerbn@hotmail.com",
      action: "catalog.imported",
      entityType: "Test",
      entityId: test.id,
      summary:
        "Importat el cataleg TALCAT provisional amb les formes fixes v1 i v2.",
      metadata: {
        forms: [...groupedForms.keys()],
        totalItems: rows.length,
        sizes,
        metrics,
      },
    },
  });

  console.log(
    JSON.stringify(
      {
        test: test.name,
        importedMode: "legacy_forms",
        forms: [...groupedForms.keys()],
        totalRows: rows.length,
        uniqueItems: itemCache.size,
      },
      null,
      2,
    ),
  );
}

async function main() {
  const {
    v1Path,
    v2Path,
    reportPath,
    pilotCatalogPath,
    pilotFormCatalogPath,
  } = getDataPaths();
  const organization = await ensureOrganization();

  await clearOperationalCatalog();

  const pilotCatalog = await readJsonIfExists<PilotCatalog>(pilotCatalogPath);
  const pilotFormCatalog = await readJsonIfExists<PilotFormCatalog>(pilotFormCatalogPath);

  if (pilotCatalog && pilotFormCatalog) {
    await importPilotCatalog(organization.id, pilotCatalog, pilotFormCatalog);
    return;
  }

  const [v1Csv, v2Csv, releaseSummary] = await Promise.all([
    readFile(v1Path, "utf8"),
    readFile(v2Path, "utf8"),
    readFile(reportPath, "utf8"),
  ]);
  await importLegacyCatalog(organization.id, v1Csv, v2Csv, releaseSummary);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
