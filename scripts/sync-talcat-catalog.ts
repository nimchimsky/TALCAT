import { readFile } from "node:fs/promises";
import path from "node:path";

import { ItemType, PrismaClient, TestStatus } from "@prisma/client";

const prisma = new PrismaClient();

type CatalogRow = {
  formVersion: string;
  itemOrder: number;
  section: string;
  itemId: string;
  spellingRaw: string;
  spellingClean: string;
};

function repairMojibake(value: string) {
  if (!value) {
    return value;
  }

  if (value.includes("Ã") || value.includes("Â")) {
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
      } satisfies CatalogRow;
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

function getDataPaths() {
  const dataDir =
    process.env.TALCAT_DATA_DIR ??
    path.resolve(process.cwd(), "..", "data", "forms");
  const reportPath =
    process.env.TALCAT_RELEASE_SUMMARY_PATH ??
    path.resolve(process.cwd(), "..", "reports", "release_v1_summary.md");

  return {
    v1Path: path.join(dataDir, "short_form_v1_items.csv"),
    v2Path: path.join(dataDir, "short_form_v2_items.csv"),
    reportPath,
  };
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

async function main() {
  const { v1Path, v2Path, reportPath } = getDataPaths();
  const [v1Csv, v2Csv, releaseSummary] = await Promise.all([
    readFile(v1Path, "utf8"),
    readFile(v2Path, "utf8"),
    readFile(reportPath, "utf8"),
  ]);

  const rows = [...parseCsv(v1Csv), ...parseCsv(v2Csv)];
  const { metrics, sizes } = parseReleaseMetrics(releaseSummary);
  const organization = await ensureOrganization();

  await clearOperationalCatalog();

  const groupedForms = new Map<string, CatalogRow[]>();
  for (const row of rows) {
    const bucket = groupedForms.get(row.formVersion) ?? [];
    bucket.push(row);
    groupedForms.set(row.formVersion, bucket);
  }

  const test = await prisma.test.create({
    data: {
      organizationId: organization.id,
      slug: "talcat-release-v1",
      name: "TALCAT Release V1",
      description:
        "Cataleg operatiu importat des de short_form_v1_items.csv i short_form_v2_items.csv.",
      status: TestStatus.ACTIVE,
      deliveryMode: "mobile-first",
      scoreModel: "word-primary",
      estimatedMinutes: 8,
    },
  });

  const itemCache = new Map<string, { id: string }>();

  for (const [formVersion, formRows] of [...groupedForms.entries()].sort()) {
    const versionNumber = Number(formVersion.replace(/[^\d]/g, "")) || 1;
    const wordCount = formRows.filter((row) => row.section === "word").length;
    const pseudowordCount = formRows.filter(
      (row) => row.section === "pseudoword",
    ).length;

    const form = await prisma.form.create({
      data: {
        testId: test.id,
        code: `TALCAT-${formVersion.toUpperCase()}`,
        version: versionNumber,
        label: `Forma ${formVersion.toUpperCase()}`,
        isPrimary: formVersion === "v1",
        itemCount: formRows.length,
        wordCount,
        pseudowordCount,
        timeLimitSec: 480,
      },
    });

    for (const row of formRows.sort((a, b) => a.itemOrder - b.itemOrder)) {
      const stableKey = `talcat-${row.itemId}`;
      let item = itemCache.get(stableKey);

      if (!item) {
        item = await prisma.itemBankEntry.create({
          data: {
            stableKey,
            prompt: row.spellingClean || row.spellingRaw,
            itemType:
              row.section === "pseudoword" ? ItemType.PSEUDOWORD : ItemType.WORD,
          },
          select: { id: true },
        });

        itemCache.set(stableKey, item);
      }

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
      organizationId: organization.id,
      actorEmail: "rogerbn@hotmail.com",
      action: "catalog.imported",
      entityType: "Test",
      entityId: test.id,
      summary:
        "Importat el cataleg TALCAT Release V1 amb les formes reals v1 i v2.",
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
        forms: [...groupedForms.keys()],
        totalRows: rows.length,
        uniqueItems: itemCache.size,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
