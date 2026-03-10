import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.response.deleteMany();
  await prisma.attempt.deleteMany();
  await prisma.session.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.formItem.deleteMany();
  await prisma.itemBankEntry.deleteMany();
  await prisma.form.deleteMany();
  await prisma.test.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.adminUser.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.organization.deleteMany();

  const organization = await prisma.organization.create({
    data: {
      name: "TALCAT",
      slug: "analisi-resultats",
      adminUsers: {
        create: [
          {
            name: "Roger Admin",
            email: "admin@example.com",
            role: "OWNER",
            authProvider: "github",
          },
          {
            name: "Equip Psicometria",
            email: "psychometrics@example.com",
            role: "ANALYST",
            authProvider: "github",
          },
        ],
      },
      participants: {
        create: [
          {
            publicCode: "CAT-24031",
            fullName: "Participant A",
            email: "participant.a@example.com",
            birthYear: 2002,
            homeRegion: "Barcelona",
            catalanProfile: "natiu",
            consentAt: new Date("2026-03-01T08:30:00.000Z"),
            lastSeenAt: new Date("2026-03-10T08:00:00.000Z"),
          },
          {
            publicCode: "CAT-24032",
            fullName: "Participant B",
            email: "participant.b@example.com",
            birthYear: 1999,
            homeRegion: "Girona",
            catalanProfile: "L2 avancat",
            consentAt: new Date("2026-03-03T10:15:00.000Z"),
            lastSeenAt: new Date("2026-03-09T17:40:00.000Z"),
          },
          {
            publicCode: "CAT-24033",
            fullName: "Participant C",
            email: "participant.c@example.com",
            birthYear: 1988,
            homeRegion: "Lleida",
            catalanProfile: "natiu",
            consentAt: new Date("2026-03-04T12:45:00.000Z"),
            lastSeenAt: new Date("2026-03-10T07:20:00.000Z"),
          },
        ],
      },
    },
    include: {
      participants: true,
    },
  });

  const [participantA, participantB] = organization.participants;

  const lexicalTest = await prisma.test.create({
    data: {
      organizationId: organization.id,
      slug: "catala-lexic-v1",
      name: "Test lexic general",
      description: "Forma operativa curta per reconeixement lexic en catala.",
      status: "ACTIVE",
      estimatedMinutes: 8,
      deliveryMode: "mobile-first",
      scoreModel: "word-primary",
    },
  });

  const learnerTest = await prisma.test.create({
    data: {
      organizationId: organization.id,
      slug: "catala-l2-screening",
      name: "Cribratge L2",
      description: "Versio orientada a aprenents amb control de biaix i ritme.",
      status: "ACTIVE",
      estimatedMinutes: 10,
      deliveryMode: "mobile-first",
      scoreModel: "dual-report",
    },
  });

  await prisma.test.create({
    data: {
      organizationId: organization.id,
      slug: "validation-battery-a",
      name: "Validation battery",
      description: "Bateria de validacio parallela per correlacions externes.",
      status: "DRAFT",
      estimatedMinutes: 15,
      deliveryMode: "supervised",
      scoreModel: "research-bundle",
    },
  });

  const formV1 = await prisma.form.create({
    data: {
      testId: lexicalTest.id,
      code: "LRT-V1-A",
      version: 1,
      label: "Forma A",
      isPrimary: true,
      timeLimitSec: 480,
      itemCount: 70,
      wordCount: 50,
      pseudowordCount: 20,
    },
  });

  const learnerForm = await prisma.form.create({
    data: {
      testId: learnerTest.id,
      code: "L2-V1-A",
      version: 1,
      label: "Cribratge inicial",
      isPrimary: true,
      itemCount: 64,
      wordCount: 44,
      pseudowordCount: 20,
      timeLimitSec: 600,
    },
  });

  const [wordA, wordB, pseudoA] = await prisma.itemBankEntry.createManyAndReturn({
    data: [
      { stableKey: "casa", prompt: "casa", itemType: "WORD", difficulty: -1.2 },
      { stableKey: "engalipa", prompt: "engalipa", itemType: "WORD", difficulty: 0.9 },
      { stableKey: "bolfira", prompt: "bolfira", itemType: "PSEUDOWORD", difficulty: 0.7 },
    ],
  });

  await prisma.formItem.createMany({
    data: [
      { formId: formV1.id, itemId: wordA.id, position: 1, blockLabel: "warmup" },
      { formId: formV1.id, itemId: wordB.id, position: 2, blockLabel: "core" },
      { formId: formV1.id, itemId: pseudoA.id, position: 3, blockLabel: "control" },
      { formId: learnerForm.id, itemId: wordA.id, position: 1, blockLabel: "starter" },
      { formId: learnerForm.id, itemId: pseudoA.id, position: 2, blockLabel: "control" },
    ],
  });

  const assignmentA = await prisma.assignment.create({
    data: {
      participantId: participantA.id,
      testId: lexicalTest.id,
      invitationToken: "invite-cat-24031",
      invitedByEmail: "admin@example.com",
      scheduledAt: new Date("2026-03-10T08:00:00.000Z"),
      status: "SCORED",
      startedAt: new Date("2026-03-10T08:03:00.000Z"),
      completedAt: new Date("2026-03-10T08:11:00.000Z"),
    },
  });

  const assignmentB = await prisma.assignment.create({
    data: {
      participantId: participantB.id,
      testId: learnerTest.id,
      invitationToken: "invite-cat-24032",
      invitedByEmail: "admin@example.com",
      scheduledAt: new Date("2026-03-10T09:15:00.000Z"),
      status: "IN_PROGRESS",
      startedAt: new Date("2026-03-10T09:19:00.000Z"),
    },
  });

  const sessionA = await prisma.session.create({
    data: {
      participantId: participantA.id,
      testId: lexicalTest.id,
      deviceLabel: "iPhone Safari",
      deviceGroup: "mobile",
      startedAt: new Date("2026-03-10T08:03:00.000Z"),
      endedAt: new Date("2026-03-10T08:11:00.000Z"),
      ipCountry: "ES",
      status: "FINISHED",
    },
  });

  const sessionB = await prisma.session.create({
    data: {
      participantId: participantB.id,
      testId: learnerTest.id,
      deviceLabel: "Chrome Desktop",
      deviceGroup: "desktop",
      startedAt: new Date("2026-03-10T09:19:00.000Z"),
      ipCountry: "ES",
      status: "LIVE",
    },
  });

  const attemptA = await prisma.attempt.create({
    data: {
      participantId: participantA.id,
      testId: lexicalTest.id,
      formId: formV1.id,
      assignmentId: assignmentA.id,
      sessionId: sessionA.id,
      status: "SCORED",
      score: 612,
      proficiencyBand: "Banda alta",
      dPrime: 2.11,
      criterionC: -0.06,
      accuracy: 0.89,
      submittedAt: new Date("2026-03-10T08:11:00.000Z"),
      reviewedAt: new Date("2026-03-10T08:20:00.000Z"),
    },
  });

  const attemptB = await prisma.attempt.create({
    data: {
      participantId: participantB.id,
      testId: learnerTest.id,
      formId: learnerForm.id,
      assignmentId: assignmentB.id,
      sessionId: sessionB.id,
      status: "IN_PROGRESS",
      accuracy: 0.71,
      dPrime: 1.16,
      criterionC: 0.18,
    },
  });

  await prisma.response.createMany({
    data: [
      { attemptId: attemptA.id, itemId: wordA.id, position: 1, answerBoolean: true, isCorrect: true, rtMs: 802 },
      { attemptId: attemptA.id, itemId: wordB.id, position: 2, answerBoolean: true, isCorrect: true, rtMs: 947 },
      { attemptId: attemptA.id, itemId: pseudoA.id, position: 3, answerBoolean: false, isCorrect: true, rtMs: 1035 },
      { attemptId: attemptB.id, itemId: wordA.id, position: 1, answerBoolean: true, isCorrect: true, rtMs: 1112 },
      { attemptId: attemptB.id, itemId: pseudoA.id, position: 2, answerBoolean: true, isCorrect: false, rtMs: 1458, flagged: true },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      {
        organizationId: organization.id,
        actorEmail: "admin@example.com",
        action: "test.activated",
        entityType: "Test",
        entityId: lexicalTest.id,
        summary: "Activada la forma operativa del test lexic general.",
      },
      {
        organizationId: organization.id,
        actorEmail: "psychometrics@example.com",
        action: "result.reviewed",
        entityType: "Attempt",
        entityId: attemptA.id,
        summary: "Revisat un resultat alt amb falsa alarma controlada.",
      },
      {
        organizationId: organization.id,
        actorEmail: "admin@example.com",
        action: "session.flagged",
        entityType: "Attempt",
        entityId: attemptB.id,
        summary: "Sessio en curs marcada per criteri conservador elevat.",
      },
    ],
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
