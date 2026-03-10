import { randomBytes } from "node:crypto";

import {
  AttemptStatus,
  ItemType,
  SessionStatus,
  TestStatus,
} from "@prisma/client";
import { headers } from "next/headers";

import { computeDPrime, getBandLabel } from "@/lib/scoring";
import { prisma } from "@/lib/prisma";

export type PublicFormSummary = {
  code: string;
  label: string;
  testName: string;
  description: string;
  estimatedMinutes: number;
  itemCount: number;
  wordCount: number;
  pseudowordCount: number;
};

export type PublicTestSummary = {
  id: string;
  name: string;
  description: string;
  estimatedMinutes: number;
  forms: PublicFormSummary[];
};

export type PublicHomeData = {
  tests: PublicTestSummary[];
};

export type RunnerItem = {
  itemId: string;
  prompt: string;
  position: number;
  itemType: ItemType;
};

export type PublicAttemptSession = {
  attemptId: string;
  participantCode: string;
  participantName: string | null;
  testName: string;
  formLabel: string;
  formCode: string;
  items: RunnerItem[];
};

export type ResultSnapshot = {
  participantCode: string;
  participantName: string | null;
  latestAttempt: {
    id: string;
    testName: string;
    formLabel: string;
    status: AttemptStatus;
    submittedAt: string | null;
    accuracy: number | null;
    dPrime: number | null;
    criterionC: number | null;
    score: number | null;
    proficiencyBand: string | null;
  } | null;
  attemptsCount: number;
};

const PUBLIC_TEST_SUMMARY =
  "Prova breu de decisio lexical en catala per identificar paraules i no paraules.";

function buildPublicTestDescription(
  estimatedMinutes: number,
  formsCount: number,
) {
  const formsLabel = formsCount === 1 ? "1 forma disponible" : `${formsCount} formes disponibles`;
  return `${PUBLIC_TEST_SUMMARY} Durada aproximada de ${estimatedMinutes} minuts i ${formsLabel}.`;
}

const fallbackHomeData: PublicHomeData = {
  tests: [
    {
      id: "fallback-talcat",
      name: "TALCAT Release V1",
      description:
        "Prova breu de decisio lexical en catala amb dues formes equivalents.",
      estimatedMinutes: 8,
      forms: [
        {
          code: "TALCAT-V1",
          label: "Forma V1",
          testName: "TALCAT Release V1",
          description: "Versio principal de la prova curta.",
          estimatedMinutes: 8,
          itemCount: 60,
          wordCount: 50,
          pseudowordCount: 10,
        },
        {
          code: "TALCAT-V2",
          label: "Forma V2",
          testName: "TALCAT Release V1",
          description: "Forma paral.lela per seguiment o retest.",
          estimatedMinutes: 8,
          itemCount: 60,
          wordCount: 50,
          pseudowordCount: 10,
        },
      ],
    },
  ],
};

function inferDeviceGroup(userAgent: string | null) {
  if (!userAgent) {
    return "unknown";
  }

  const normalized = userAgent.toLowerCase();
  if (normalized.includes("mobile") || normalized.includes("iphone")) {
    return "mobile";
  }

  if (normalized.includes("ipad") || normalized.includes("tablet")) {
    return "tablet";
  }

  return "desktop";
}

async function getOrganizationId() {
  const organization = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!organization) {
    throw new Error("No hi ha cap organitzacio configurada.");
  }

  return organization.id;
}

async function generateParticipantCode() {
  for (let index = 0; index < 10; index += 1) {
    const code = `TALCAT-${randomBytes(3).toString("hex").toUpperCase()}`;
    const existing = await prisma.participant.findUnique({
      where: { publicCode: code },
      select: { id: true },
    });

    if (!existing) {
      return code;
    }
  }

  throw new Error("No s'ha pogut generar un codi unic.");
}

export async function getPublicHomeData(): Promise<PublicHomeData> {
  if (!process.env.DATABASE_URL) {
    return fallbackHomeData;
  }

  const tests = await prisma.test.findMany({
    where: { status: TestStatus.ACTIVE },
    include: {
      forms: {
        orderBy: { version: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (tests.length === 0) {
    return fallbackHomeData;
  }

  return {
    tests: tests.map((test) => ({
      id: test.id,
      name: test.name,
      description: buildPublicTestDescription(
        test.estimatedMinutes,
        test.forms.length,
      ),
      estimatedMinutes: test.estimatedMinutes,
      forms: test.forms.map((form) => ({
        code: form.code,
        label: form.label,
        testName: test.name,
        description: `${form.wordCount} paraules i ${form.pseudowordCount} distractors.`,
        estimatedMinutes: test.estimatedMinutes,
        itemCount: form.itemCount,
        wordCount: form.wordCount,
        pseudowordCount: form.pseudowordCount,
      })),
    })),
  };
}

export function getPublicTestSummary(
  estimatedMinutes: number,
  formsCount = 1,
) {
  return buildPublicTestDescription(estimatedMinutes, formsCount);
}

export async function getPublicFormByCode(formCode: string) {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  return prisma.form.findUnique({
    where: { code: formCode },
    include: {
      test: true,
      items: {
        orderBy: { position: "asc" },
        include: {
          item: true,
        },
      },
    },
  });
}

export async function createPublicAttempt(
  formCode: string,
  payload: { fullName?: string; email?: string },
) {
  const form = await getPublicFormByCode(formCode);

  if (!form || form.test.status !== TestStatus.ACTIVE) {
    throw new Error("Aquesta prova no esta disponible ara mateix.");
  }

  const organizationId = await getOrganizationId();
  const publicCode = await generateParticipantCode();
  const headerStore = await headers();
  const userAgent = headerStore.get("user-agent");
  const now = new Date();

  const participant = await prisma.participant.create({
    data: {
      organizationId,
      publicCode,
      fullName: payload.fullName?.trim() || null,
      email: payload.email?.trim() || null,
      consentAt: now,
      lastSeenAt: now,
    },
  });

  const session = await prisma.session.create({
    data: {
      participantId: participant.id,
      testId: form.test.id,
      startedAt: now,
      status: SessionStatus.LIVE,
      deviceLabel: userAgent,
      deviceGroup: inferDeviceGroup(userAgent),
    },
  });

  const attempt = await prisma.attempt.create({
    data: {
      participantId: participant.id,
      testId: form.test.id,
      formId: form.id,
      sessionId: session.id,
      status: AttemptStatus.IN_PROGRESS,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId,
      actorEmail: participant.email,
      action: "attempt.started",
      entityType: "Attempt",
      entityId: attempt.id,
      summary: `Iniciada una nova sessio publica per a ${form.code}.`,
      metadata: {
        participantCode: publicCode,
        formCode: form.code,
      },
    },
  });

  return attempt.id;
}

export async function getAttemptSession(attemptId: string) {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      participant: true,
      test: true,
      form: {
        include: {
          items: {
            orderBy: { position: "asc" },
            include: {
              item: true,
            },
          },
        },
      },
    },
  });

  if (!attempt) {
    return null;
  }

  return {
    attemptId: attempt.id,
    participantCode: attempt.participant.publicCode,
    participantName: attempt.participant.fullName,
    testName: attempt.test.name,
    formLabel: attempt.form.label,
    formCode: attempt.form.code,
    items: attempt.form.items.map((entry) => ({
      itemId: entry.item.id,
      prompt: entry.item.prompt,
      position: entry.position,
      itemType: entry.item.itemType,
    })),
  } satisfies PublicAttemptSession;
}

export async function submitAttempt(
  attemptId: string,
  responses: Array<{
    itemId: string;
    position: number;
    answerBoolean: boolean;
    rtMs: number;
  }>,
) {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      participant: true,
      session: true,
      form: {
        include: {
          items: {
            orderBy: { position: "asc" },
            include: {
              item: true,
            },
          },
        },
      },
    },
  });

  if (!attempt) {
    throw new Error("No s'ha trobat la sessio.");
  }

  const itemMap = new Map(
    attempt.form.items.map((entry) => [
      entry.position,
      {
        itemId: entry.item.id,
        itemType: entry.item.itemType,
      },
    ]),
  );

  const normalized = responses
    .filter((response) => itemMap.has(response.position))
    .map((response) => {
      const item = itemMap.get(response.position)!;
      const isCorrect =
        item.itemType === ItemType.WORD
          ? response.answerBoolean
          : !response.answerBoolean;

      return {
        attemptId: attempt.id,
        itemId: item.itemId,
        position: response.position,
        answerBoolean: response.answerBoolean,
        isCorrect,
        rtMs: Math.max(0, Math.round(response.rtMs)),
      };
    });

  if (normalized.length !== attempt.form.items.length) {
    throw new Error("La prova no s'ha completat sencera.");
  }

  const wordTotal = attempt.form.items.filter(
    (entry) => entry.item.itemType === ItemType.WORD,
  ).length;
  const pseudoTotal = attempt.form.items.filter(
    (entry) => entry.item.itemType === ItemType.PSEUDOWORD,
  ).length;
  const wordCorrect = normalized.filter((response) => {
    const item = itemMap.get(response.position)!;
    return item.itemType === ItemType.WORD && response.isCorrect;
  }).length;
  const pseudoFalseAlarms = normalized.filter((response) => {
    const item = itemMap.get(response.position)!;
    return item.itemType === ItemType.PSEUDOWORD && response.answerBoolean;
  }).length;
  const accuracy =
    normalized.filter((response) => response.isCorrect).length / normalized.length;
  const { dPrime, criterionC } = computeDPrime(
    wordCorrect,
    wordTotal,
    pseudoFalseAlarms,
    pseudoTotal,
  );
  const score = Math.round(accuracy * 100);

  await prisma.response.deleteMany({
    where: { attemptId: attempt.id },
  });

  await prisma.response.createMany({
    data: normalized,
  });

  await prisma.attempt.update({
    where: { id: attempt.id },
    data: {
      status: AttemptStatus.SCORED,
      accuracy,
      dPrime,
      criterionC,
      score,
      proficiencyBand: getBandLabel(accuracy),
      submittedAt: new Date(),
      reviewedAt: new Date(),
    },
  });

  await prisma.session.update({
    where: { id: attempt.sessionId ?? undefined },
    data: {
      status: SessionStatus.FINISHED,
      endedAt: new Date(),
    },
  });

  await prisma.participant.update({
    where: { id: attempt.participantId },
    data: {
      lastSeenAt: new Date(),
    },
  });

  return {
    participantCode: attempt.participant.publicCode,
  };
}

export async function getResultSnapshot(code: string) {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  const participant = await prisma.participant.findUnique({
    where: { publicCode: code.trim().toUpperCase() },
    include: {
      attempts: {
        orderBy: { createdAt: "desc" },
        include: {
          test: true,
          form: true,
        },
      },
    },
  });

  if (!participant) {
    return null;
  }

  const latest = participant.attempts[0] ?? null;

  return {
    participantCode: participant.publicCode,
    participantName: participant.fullName,
    latestAttempt: latest
      ? {
          id: latest.id,
          testName: latest.test.name,
          formLabel: latest.form.label,
          status: latest.status,
          submittedAt: latest.submittedAt?.toISOString() ?? null,
          accuracy: latest.accuracy,
          dPrime: latest.dPrime,
          criterionC: latest.criterionC,
          score: latest.score,
          proficiencyBand: latest.proficiencyBand,
        }
      : null,
    attemptsCount: participant.attempts.length,
  } satisfies ResultSnapshot;
}
