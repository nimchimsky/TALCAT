import { createHash, randomBytes } from "node:crypto";

import {
  AttemptStatus,
  ItemType,
  SessionStatus,
  TestStatus,
} from "@prisma/client";
import { headers } from "next/headers";

import {
  applyAdaptiveAnswer,
  createInitialAdaptiveState,
  finalizeAdaptiveAttemptState,
  getAdaptiveSessionStateFromAttempt,
  type AdaptiveEngineState,
  type AdaptiveSessionState,
} from "@/lib/adaptive-engine";
import { computeDPrime, getBandLabel } from "@/lib/scoring";
import { prisma } from "@/lib/prisma";

type CatalogForm = {
  id: string;
  code: string;
  label: string;
  version: number;
  isPrimary: boolean;
  itemCount: number;
  wordCount: number;
  pseudowordCount: number;
};

type CatalogTest = {
  id: string;
  slug: string;
  name: string;
  estimatedMinutes: number;
  forms: CatalogForm[];
};

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

export type PublicJourneySummary = {
  id: "quick" | "full";
  title: string;
  description: string;
  note: string;
  estimatedMinutes: number;
  ctaLabel: string;
  href: string;
};

export type PublicHomeData = {
  tests: PublicTestSummary[];
  journeys: PublicJourneySummary[];
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
  deliveryMode: string;
  items: RunnerItem[];
};

export type PublicBatteryPlan = {
  id: "full";
  title: string;
  description: string;
  note: string;
  estimatedMinutes: number;
  totalSteps: number;
  completedSteps: number;
  participantCode: string | null;
  nextFormCode: string | null;
  steps: Array<{
    formCode: string;
    label: string;
    testName: string;
    estimatedMinutes: number;
    completed: boolean;
  }>;
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
    correctCount: number | null;
    totalItems: number | null;
    averageRtMs: number | null;
    accuracySummary: string | null;
    sensitivitySummary: string | null;
    responseStyleSummary: string | null;
  } | null;
  attemptsCount: number;
  batteryProgress: {
    completed: number;
    total: number;
    href: string;
    nextHref: string | null;
    nextLabel: string | null;
  };
  nextSteps: Array<{
    title: string;
    description: string;
    href: string;
    ctaLabel: string;
  }>;
};

const PUBLIC_TEST_SUMMARY =
  "Administracio TALCAT de decisio lexical en catala per identificar paraules i no paraules.";

function buildPublicTestDescription(
  estimatedMinutes: number,
  formsCount: number,
) {
  const formsLabel =
    formsCount === 1
      ? "1 administracio disponible"
      : `${formsCount} administracions disponibles`;
  return `${PUBLIC_TEST_SUMMARY} Durada aproximada de ${estimatedMinutes} minuts i ${formsLabel}.`;
}

function buildPublicFormDescription(form: CatalogForm) {
  const code = form.code.toLowerCase();
  if (code.startsWith("anchor_")) {
    return "Bloc d'ancoratge pilot assignat per protocol per a enllac, control i QA.";
  }

  if (code.startsWith("fallback_")) {
    return "Administracio fixa de fallback per quan no es fa servir el motor adaptatiu.";
  }

  return `${form.wordCount} paraules i ${form.pseudowordCount} distractors.`;
}

const fallbackHomeData: PublicHomeData = {
  tests: [
    {
      id: "fallback-talcat",
      name: "TALCAT Pilot",
      description:
        "Pilot TALCAT amb administracions fixes de fallback mentre es prepara el motor adaptatiu.",
      estimatedMinutes: 8,
      forms: [
        {
          code: "fallback_v1",
          label: "Fallback V1",
          testName: "TALCAT Pilot",
          description: "Administracio fixa de fallback.",
          estimatedMinutes: 8,
          itemCount: 60,
          wordCount: 42,
          pseudowordCount: 18,
        },
        {
          code: "fallback_v2",
          label: "Fallback V2",
          testName: "TALCAT Pilot",
          description: "Segona administracio fixa de fallback.",
          estimatedMinutes: 8,
          itemCount: 60,
          wordCount: 42,
          pseudowordCount: 18,
        },
      ],
    },
  ],
  journeys: [
    {
      id: "quick",
      title: "Avaluacio rapida",
      description: "Completa una sola administracio TALCAT per obtenir una lectura breu del rendiment.",
      note: "Segueix l'administracio que t'indiqui l'equip de recerca.",
      estimatedMinutes: 8,
      ctaLabel: "Veu les administracions",
      href: "#versions-talcat",
    },
    {
      id: "full",
      title: "Bateria completa",
      description: "Segueix el recorregut complet i afegeix, quan estiguin actives, les proves de validacio.",
      note: "Ara mateix inclou una administracio TALCAT assignada per protocol i, quan pertoqui, proves addicionals de validacio.",
      estimatedMinutes: 8,
      ctaLabel: "Comenca la bateria",
      href: "/itineraris/completa",
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

function isTalcatTest(test: { slug: string; name: string }) {
  const normalized = `${test.slug} ${test.name}`.toLowerCase();
  return normalized.includes("talcat");
}

function getPrimaryForm(test: CatalogTest) {
  return [...test.forms].sort((left, right) => {
    if (left.isPrimary !== right.isPrimary) {
      return left.isPrimary ? -1 : 1;
    }

    return left.version - right.version;
  })[0] ?? null;
}

function isAnchorForm(form: { code: string }) {
  return form.code.toLowerCase().startsWith("anchor_");
}

function getOperationalTalcatForm(test: CatalogTest) {
  const sortedForms = [...test.forms].sort((left, right) => {
    if (left.isPrimary !== right.isPrimary) {
      return left.isPrimary ? -1 : 1;
    }

    return left.version - right.version;
  });

  return (
    sortedForms.find((form) => !isAnchorForm(form) && form.isPrimary) ??
    sortedForms.find((form) => !isAnchorForm(form)) ??
    sortedForms[0] ??
    null
  );
}

function buildBatterySteps(tests: CatalogTest[]) {
  const talcatSteps = tests
    .filter(isTalcatTest)
    .map((test) => {
      const form = getOperationalTalcatForm(test);

      if (!form) {
        return null;
      }

      return {
        formCode: form.code,
        label: form.label,
        testName: test.name,
        estimatedMinutes: test.estimatedMinutes,
        kind: "talcat" as const,
      };
    })
    .filter(
      (
        entry,
      ): entry is {
        formCode: string;
        label: string;
        testName: string;
        estimatedMinutes: number;
        kind: "talcat";
      } => Boolean(entry),
    );
  const validationSteps = tests
    .filter((test) => !isTalcatTest(test))
    .map((test) => ({
      test,
      form: getPrimaryForm(test),
    }))
    .filter(
      (
        entry,
      ): entry is {
        test: CatalogTest;
        form: CatalogForm;
      } => Boolean(entry.form),
    )
    .map((entry) => ({
      formCode: entry.form.code,
      label: entry.form.label,
      testName: entry.test.name,
      estimatedMinutes: entry.test.estimatedMinutes,
      kind: "validation" as const,
    }));

  return [...talcatSteps, ...validationSteps];
}

function getHashKey(seed: string, value: string) {
  return createHash("sha256").update(`${seed}:${value}`).digest("hex");
}

function getAttemptSequence<
  T extends {
    item: {
      id: string;
      prompt: string;
      itemType: ItemType;
    };
  },
>(attemptId: string, items: T[]) {
  return [...items]
    .sort((left, right) =>
      getHashKey(attemptId, left.item.id).localeCompare(
        getHashKey(attemptId, right.item.id),
      ),
    )
    .map((entry, index) => ({
      ...entry,
      runPosition: index + 1,
    }));
}

function getAccuracySummary(accuracy: number | null) {
  if (accuracy === null) {
    return null;
  }

  if (accuracy >= 0.9) {
    return "Has distingit molt be entre paraules i no paraules en aquesta sessio.";
  }

  if (accuracy >= 0.8) {
    return "Has mantingut un nivell alt de precisio durant la prova.";
  }

  if (accuracy >= 0.65) {
    return "El rendiment es intermedi i encara hi ha marge de consolidacio.";
  }

  return "La prova indica que encara hi ha forca marge per consolidar la distincio lexical.";
}

function getSensitivitySummary(dPrime: number | null) {
  if (dPrime === null) {
    return null;
  }

  if (dPrime >= 2) {
    return "La sensibilitat es alta: has separat amb claredat les paraules de les pseudoparaules.";
  }

  if (dPrime >= 1) {
    return "La sensibilitat es funcional: la majoria de decisions lexicals van en la direccio correcta.";
  }

  return "La sensibilitat es baixa: et pot convenir repetir la prova en bones condicions o ampliar l'avaluacio.";
}

function getResponseStyleSummary(criterionC: number | null) {
  if (criterionC === null) {
    return null;
  }

  if (criterionC >= 0.25) {
    return "L'estil de resposta ha estat prudent: tendeixes a reservar el si per a paraules molt segures.";
  }

  if (criterionC <= -0.25) {
    return "L'estil de resposta ha estat arriscat: tendeixes a acceptar mes items com a paraula.";
  }

  return "L'estil de resposta ha estat equilibrat, sense un biaix clar cap al si o cap al no.";
}

function getAverageRtMs(
  responses: Array<{
    rtMs: number | null;
  }>,
) {
  const values = responses
    .map((response) => response.rtMs)
    .filter((value): value is number => typeof value === "number" && value >= 0);

  if (values.length === 0) {
    return null;
  }

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function buildJourneys(tests: CatalogTest[]): PublicJourneySummary[] {
  const talcatTests = tests.filter(isTalcatTest);
  const talcatForms = talcatTests.flatMap((test) => test.forms);
  const batterySteps = buildBatterySteps(tests);
  const talcatBatteryCount = batterySteps.filter(
    (entry) => entry.kind === "talcat",
  ).length;
  const fullMinutes = batterySteps.reduce(
    (total, entry) => total + entry.estimatedMinutes,
    0,
  );
  const validationCount = batterySteps.filter(
    (entry) => entry.kind === "validation",
  ).length;

  return [
    {
      id: "quick",
      title: "Avaluacio rapida",
      description:
        "Completa una sola administracio TALCAT per obtenir una lectura breu i immediata.",
      note:
        talcatForms.length > 1
          ? "L'administracio concreta depen del protocol del pilot i del teu codi de participant."
          : "L'administracio principal et dona una estimacio rapida del rendiment actual.",
      estimatedMinutes: talcatTests[0]?.estimatedMinutes ?? tests[0]?.estimatedMinutes ?? 8,
      ctaLabel: "Veu les administracions",
      href: "#versions-talcat",
    },
    {
      id: "full",
      title: "Bateria completa",
      description:
        "Segueix el recorregut complet del participant i afegeix les proves de validacio actives.",
      note:
        validationCount > 0
          ? `Ara mateix inclou ${talcatBatteryCount} administracio${talcatBatteryCount === 1 ? "" : "ns"} TALCAT assignada${talcatBatteryCount === 1 ? "" : "es"} per protocol i ${validationCount} prova${validationCount === 1 ? "" : "es"} de validacio.`
          : `Ara mateix inclou ${talcatBatteryCount} administracio${talcatBatteryCount === 1 ? "" : "ns"} TALCAT assignada${talcatBatteryCount === 1 ? "" : "es"} per protocol; quan s'activin mes proves s'afegiran automaticament.`,
      estimatedMinutes: fullMinutes || talcatTests[0]?.estimatedMinutes || 8,
      ctaLabel: "Comenca la bateria",
      href: "/itineraris/completa",
    },
  ];
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

async function getLatestAdaptiveTheta(participantId: string) {
  const latest = await prisma.attempt.findFirst({
    where: {
      participantId,
      deliveryMode: "adaptive",
      status: AttemptStatus.SCORED,
      finalTheta: {
        not: null,
      },
    },
    orderBy: { submittedAt: "desc" },
    select: {
      finalTheta: true,
    },
  });

  return latest?.finalTheta ?? null;
}

async function resolveAdaptiveItemEntry(payload: {
  stableKey: string;
  prompt: string;
  itemType: ItemType;
}) {
  const existing = await prisma.itemBankEntry.findUnique({
    where: {
      stableKey: payload.stableKey,
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.itemBankEntry.create({
    data: {
      stableKey: payload.stableKey,
      prompt: payload.prompt,
      itemType: payload.itemType,
    },
    select: {
      id: true,
    },
  });
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

async function getActiveCatalog(): Promise<CatalogTest[]> {
  const tests = await prisma.test.findMany({
    where: { status: TestStatus.ACTIVE },
    include: {
      forms: {
        orderBy: [{ isPrimary: "desc" }, { version: "asc" }],
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return tests.map((test) => ({
    id: test.id,
    slug: test.slug,
    name: test.name,
    estimatedMinutes: test.estimatedMinutes,
    forms: test.forms.map((form) => ({
      id: form.id,
      code: form.code,
      label: form.label,
      version: form.version,
      isPrimary: form.isPrimary,
      itemCount: form.itemCount,
      wordCount: form.wordCount,
      pseudowordCount: form.pseudowordCount,
    })),
  }));
}

async function upsertPublicParticipant(payload: {
  fullName?: string;
  email?: string;
  participantCode?: string;
  age?: number | null;
  selfReportedCatalan?: number | null;
  isNative?: boolean | null;
}) {
  const now = new Date();
  const fullName = payload.fullName?.trim() || null;
  const email = payload.email?.trim() || null;
  const participantCode = payload.participantCode?.trim().toUpperCase() || null;
  const age =
    typeof payload.age === "number" && Number.isFinite(payload.age)
      ? Math.max(12, Math.min(120, Math.round(payload.age)))
      : null;
  const birthYear =
    age === null ? null : new Date().getFullYear() - age;
  const selfReportedCatalan =
    typeof payload.selfReportedCatalan === "number" &&
    Number.isFinite(payload.selfReportedCatalan)
      ? Math.max(0, Math.min(10, payload.selfReportedCatalan))
      : null;
  const isNative =
    typeof payload.isNative === "boolean" ? payload.isNative : null;

  if (participantCode) {
    const existing = await prisma.participant.findUnique({
      where: { publicCode: participantCode },
    });

    if (!existing) {
      throw new Error("No hem trobat aquest codi de participant.");
    }

    return prisma.participant.update({
      where: { id: existing.id },
      data: {
        fullName: fullName ?? existing.fullName,
        email: email ?? existing.email,
        birthYear: birthYear ?? existing.birthYear,
        selfReportedCatalan:
          selfReportedCatalan ?? existing.selfReportedCatalan,
        isNative: isNative ?? existing.isNative,
        consentAt: existing.consentAt ?? now,
        lastSeenAt: now,
      },
    });
  }

  const organizationId = await getOrganizationId();
  const publicCode = await generateParticipantCode();

  return prisma.participant.create({
    data: {
      organizationId,
      publicCode,
      fullName,
      email,
      birthYear,
      selfReportedCatalan,
      isNative,
      consentAt: now,
      lastSeenAt: now,
    },
  });
}

function mapCatalogToPublicTests(tests: CatalogTest[]): PublicTestSummary[] {
  return tests.map((test) => ({
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
      description: buildPublicFormDescription(form),
      estimatedMinutes: test.estimatedMinutes,
      itemCount: form.itemCount,
      wordCount: form.wordCount,
      pseudowordCount: form.pseudowordCount,
    })),
  }));
}

export async function getPublicHomeData(): Promise<PublicHomeData> {
  if (!process.env.DATABASE_URL) {
    return fallbackHomeData;
  }

  const tests = await getActiveCatalog();

  if (tests.length === 0) {
    return fallbackHomeData;
  }

  return {
    tests: mapCatalogToPublicTests(tests),
    journeys: buildJourneys(tests),
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
  payload: {
    fullName?: string;
    email?: string;
    participantCode?: string;
    age?: number | null;
    selfReportedCatalan?: number | null;
    isNative?: boolean | null;
  },
) {
  const form = await getPublicFormByCode(formCode);

  if (!form || form.test.status !== TestStatus.ACTIVE) {
    throw new Error("Aquesta prova no esta disponible ara mateix.");
  }

  const participant = await upsertPublicParticipant(payload);
  const previousTheta = await getLatestAdaptiveTheta(participant.id);
  const existingAttempt = await prisma.attempt.findFirst({
    where: {
      participantId: participant.id,
      formId: form.id,
      status: AttemptStatus.IN_PROGRESS,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (existingAttempt) {
    return existingAttempt.id;
  }

  const organizationId = await getOrganizationId();
  const headerStore = await headers();
  const userAgent = headerStore.get("user-agent");
  const now = new Date();

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
      deliveryMode: form.deliveryMode,
    },
  });

  if (form.code === "adaptive_main" || form.deliveryMode === "adaptive") {
    const adaptiveState = await createInitialAdaptiveState({
      age:
        participant.birthYear === null
          ? payload.age ?? null
          : new Date().getFullYear() - participant.birthYear,
      selfReportedCatalan:
        payload.selfReportedCatalan ?? participant.selfReportedCatalan ?? null,
      isNative: payload.isNative ?? participant.isNative ?? null,
      previousTheta,
    });

    await prisma.attempt.update({
      where: { id: attempt.id },
      data: {
        startTheta: adaptiveState.startTheta,
        finalTheta: adaptiveState.currentTheta,
        finalSem: adaptiveState.currentSem,
        engineVersion: adaptiveState.engineVersion,
        engineState: adaptiveState,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      organizationId,
      actorEmail: participant.email,
      action: "attempt.started",
      entityType: "Attempt",
      entityId: attempt.id,
      summary: `Iniciada una nova sessio publica per a ${form.code}.`,
      metadata: {
        participantCode: participant.publicCode,
        formCode: form.code,
        deliveryMode: form.deliveryMode,
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

  if (attempt.deliveryMode === "adaptive" || attempt.form.code === "adaptive_main") {
    return {
      attemptId: attempt.id,
      participantCode: attempt.participant.publicCode,
      participantName: attempt.participant.fullName,
      testName: attempt.test.name,
      formLabel: attempt.form.label,
      formCode: attempt.form.code,
      deliveryMode: "adaptive",
      items: [],
    } satisfies PublicAttemptSession;
  }

  const sequence = getAttemptSequence(attempt.id, attempt.form.items);

  return {
    attemptId: attempt.id,
    participantCode: attempt.participant.publicCode,
    participantName: attempt.participant.fullName,
    testName: attempt.test.name,
    formLabel: attempt.form.label,
    formCode: attempt.form.code,
    deliveryMode: attempt.deliveryMode,
    items: sequence.map((entry) => ({
      itemId: entry.item.id,
      prompt: entry.item.prompt,
      position: entry.runPosition,
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

  const sequence = getAttemptSequence(attempt.id, attempt.form.items);
  const itemMap = new Map(
    sequence.map((entry) => [
      entry.runPosition,
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

  if (attempt.sessionId) {
    await prisma.session.update({
      where: { id: attempt.sessionId },
      data: {
        status: SessionStatus.FINISHED,
        endedAt: new Date(),
      },
    });
  }

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

export async function getAdaptiveAttemptState(
  attemptId: string,
): Promise<AdaptiveSessionState | null> {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      participant: true,
    },
  });

  if (!attempt || attempt.deliveryMode !== "adaptive") {
    return null;
  }

  return getAdaptiveSessionStateFromAttempt(attempt);
}

export async function submitAdaptiveAnswer(
  attemptId: string,
  payload: {
    answerBoolean: boolean;
    rtMs: number;
  },
) {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      participant: true,
      form: true,
      test: true,
    },
  });

  if (!attempt || attempt.deliveryMode !== "adaptive") {
    throw new Error("Aquest intent no es adaptatiu.");
  }

  const currentState = attempt.engineState as AdaptiveEngineState | null;
  if (!currentState) {
    throw new Error("Falta l'estat del motor adaptatiu.");
  }

  if (!currentState.currentItem) {
    throw new Error("No hi ha cap item pendent.");
  }

  const itemEntry = await resolveAdaptiveItemEntry({
    stableKey: currentState.currentItem.stableKey,
    prompt: currentState.currentItem.prompt,
    itemType:
      currentState.currentItem.itemType === "WORD"
        ? ItemType.WORD
        : ItemType.PSEUDOWORD,
  });
  const answeredItemType = currentState.currentItem.itemType;

  const nextState = await applyAdaptiveAnswer(currentState, payload.answerBoolean, payload.rtMs);
  const trace =
    answeredItemType === "WORD"
      ? nextState.wordTrace[nextState.wordTrace.length - 1]
      : nextState.pseudowordTrace[nextState.pseudowordTrace.length - 1];

  if (!trace) {
    throw new Error("No s'ha pogut registrar la resposta adaptativa.");
  }

  await prisma.response.create({
    data: {
      attemptId: attempt.id,
      itemId: itemEntry.id,
      position: trace.position,
      answerBoolean: trace.answerBoolean,
      isCorrect: trace.isCorrect,
      rtMs: trace.rtMs,
      itemDifficulty: trace.difficulty,
      thetaAfterItem: trace.thetaAfterItem,
      semAfterItem: trace.semAfterItem,
    },
  });

  if (nextState.completed) {
    const finalMetrics = await finalizeAdaptiveAttemptState(nextState);

    await prisma.attempt.update({
      where: { id: attempt.id },
      data: {
        status: AttemptStatus.SCORED,
        score: finalMetrics.accuracy * 100,
        scaleScore: finalMetrics.scaleScore,
        startTheta: nextState.startTheta,
        finalTheta: nextState.currentTheta,
        finalSem: nextState.currentSem,
        stopReason: nextState.stopReason,
        dPrime: finalMetrics.dPrime,
        criterionC: finalMetrics.criterionC,
        accuracy: finalMetrics.accuracy,
        proficiencyBand: getBandLabel(finalMetrics.accuracy),
        submittedAt: new Date(),
        reviewedAt: new Date(),
        engineVersion: nextState.engineVersion,
        engineState: nextState,
      },
    });

    if (attempt.sessionId) {
      await prisma.session.update({
        where: { id: attempt.sessionId },
        data: {
          status: SessionStatus.FINISHED,
          endedAt: new Date(),
        },
      });
    }

    await prisma.participant.update({
      where: { id: attempt.participantId },
      data: {
        lastSeenAt: new Date(),
      },
    });

    return {
      completed: true as const,
      participantCode: attempt.participant.publicCode,
    };
  }

  await prisma.attempt.update({
    where: { id: attempt.id },
    data: {
      finalTheta: nextState.currentTheta,
      finalSem: nextState.currentSem,
      engineVersion: nextState.engineVersion,
      engineState: nextState,
    },
  });

  return {
    completed: false as const,
    state: await getAdaptiveSessionStateFromAttempt({
      ...attempt,
      engineState: nextState,
      participant: attempt.participant,
    }),
  };
}

export async function getFullBatteryPlan(
  participantCode?: string | null,
): Promise<PublicBatteryPlan | null> {
  if (!process.env.DATABASE_URL) {
    return {
      id: "full",
      title: "Bateria completa",
      description:
        "Segueix el recorregut complet del participant i incorpora les proves de validacio quan estiguin disponibles.",
      note: "Ara mateix la bateria inclou una administracio TALCAT assignada per protocol.",
      estimatedMinutes: 8,
      totalSteps: 1,
      completedSteps: participantCode ? 0 : 0,
      participantCode: participantCode ?? null,
      nextFormCode: "adaptive_main",
      steps: [
        {
          formCode: "adaptive_main",
          label: "Adaptive Main",
          testName: "TALCAT Pilot",
          estimatedMinutes: 8,
          completed: false,
        },
      ],
    };
  }

  const tests = await getActiveCatalog();
  const batterySteps = buildBatterySteps(tests);

  if (batterySteps.length === 0) {
    return null;
  }

  const participant = participantCode
    ? await prisma.participant.findUnique({
        where: { publicCode: participantCode.trim().toUpperCase() },
        include: {
          attempts: {
            include: {
              form: true,
            },
          },
        },
      })
    : null;

  const completedCodes = new Set(
    (participant?.attempts ?? [])
      .filter((attempt) => attempt.status === AttemptStatus.SCORED)
      .map((attempt) => attempt.form.code),
  );
  const steps = batterySteps.map((entry) => ({
    formCode: entry.formCode,
    label: entry.label,
    testName: entry.testName,
    estimatedMinutes: entry.estimatedMinutes,
    completed: completedCodes.has(entry.formCode),
  }));
  const nextStep = steps.find((step) => !step.completed) ?? null;
  const validationCount = batterySteps.filter(
    (entry) => entry.kind === "validation",
  ).length;
  const talcatCount = batterySteps.filter((entry) => entry.kind === "talcat").length;

  return {
    id: "full",
    title: "Bateria completa",
    description:
      "Recorregut pensat per al participant que ha de fer TALCAT i, quan pertoqui, les proves addicionals de validacio.",
    note:
      validationCount > 0
        ? `La bateria actual inclou ${talcatCount} administracio${talcatCount === 1 ? "" : "ns"} TALCAT assignada${talcatCount === 1 ? "" : "es"} per protocol i ${validationCount} prova${validationCount === 1 ? "" : "es"} addicional${validationCount === 1 ? "" : "s"} de validacio.`
        : `Ara mateix la bateria inclou ${talcatCount} administracio${talcatCount === 1 ? "" : "ns"} TALCAT assignada${talcatCount === 1 ? "" : "es"} per protocol; quan s'afegeixin mes proves apareixeran aqui sense canviar el flux.`,
    estimatedMinutes: batterySteps.reduce(
      (total, entry) => total + entry.estimatedMinutes,
      0,
    ),
    totalSteps: steps.length,
    completedSteps: steps.filter((step) => step.completed).length,
    participantCode: participant?.publicCode ?? participantCode?.trim().toUpperCase() ?? null,
    nextFormCode: nextStep?.formCode ?? null,
    steps,
  };
}

export async function startFullBattery(payload: {
  fullName?: string;
  email?: string;
  participantCode?: string;
  age?: number | null;
  selfReportedCatalan?: number | null;
  isNative?: boolean | null;
}) {
  const participant = await upsertPublicParticipant(payload);
  const plan = await getFullBatteryPlan(participant.publicCode);

  if (!plan) {
    throw new Error("No hi ha cap bateria activa ara mateix.");
  }

  if (!plan.nextFormCode) {
    return {
      participantCode: participant.publicCode,
      attemptId: null,
    };
  }

  const attemptId = await createPublicAttempt(plan.nextFormCode, {
    fullName: payload.fullName,
    email: payload.email,
    participantCode: participant.publicCode,
    age: payload.age,
    selfReportedCatalan: payload.selfReportedCatalan,
    isNative: payload.isNative,
  });

  return {
    participantCode: participant.publicCode,
    attemptId,
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
          responses: true,
        },
      },
    },
  });

  if (!participant) {
    return null;
  }

  const latest = participant.attempts[0] ?? null;
  const batteryPlan = await getFullBatteryPlan(participant.publicCode);
  const nextSteps: ResultSnapshot["nextSteps"] = [];
  const nextBatteryStep =
    batteryPlan?.steps.find((step) => !step.completed) ?? null;

  if (batteryPlan?.nextFormCode) {
    nextSteps.push({
      title: "Passa a la seguent prova",
      description:
        nextBatteryStep
          ? `La seguent prova pendent es ${nextBatteryStep.testName} - ${nextBatteryStep.label}.`
          : "Segueix amb la seguent prova pendent del recorregut complet del participant.",
      href: `/proves/${batteryPlan.nextFormCode}?codi=${participant.publicCode}`,
      ctaLabel: "Passa a la seguent prova",
    });
  }

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
          score: latest.scaleScore ?? latest.score,
          proficiencyBand: latest.proficiencyBand,
          correctCount:
            latest.responses.length > 0
              ? latest.responses.filter((response) => response.isCorrect).length
              : null,
          totalItems: latest.responses.length || null,
          averageRtMs: getAverageRtMs(latest.responses),
          accuracySummary: getAccuracySummary(latest.accuracy),
          sensitivitySummary: getSensitivitySummary(latest.dPrime),
          responseStyleSummary: getResponseStyleSummary(latest.criterionC),
        }
      : null,
    attemptsCount: participant.attempts.length,
    batteryProgress: {
      completed: batteryPlan?.completedSteps ?? 0,
      total: batteryPlan?.totalSteps ?? 0,
      href: `/itineraris/completa?codi=${participant.publicCode}`,
      nextHref: batteryPlan?.nextFormCode
        ? `/proves/${batteryPlan.nextFormCode}?codi=${participant.publicCode}`
        : null,
      nextLabel: nextBatteryStep
        ? `${nextBatteryStep.testName} - ${nextBatteryStep.label}`
        : null,
    },
    nextSteps,
  } satisfies ResultSnapshot;
}
