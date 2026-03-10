import { AttemptStatus, SessionStatus, TestStatus } from "@prisma/client";

import {
  mockActivity,
  mockAttempts,
  mockMetrics,
  mockParticipants,
  mockSessions,
  mockTests,
  type ActivitySummary,
  type AttemptSummary,
  type Metric,
  type ParticipantSummary,
  type SessionSummary,
  type TestSummary,
} from "@/lib/mock-data";
import { prisma } from "@/lib/prisma";

export type AdminSnapshot = {
  metrics: Metric[];
  tests: TestSummary[];
  participants: ParticipantSummary[];
  sessions: SessionSummary[];
  attempts: AttemptSummary[];
  activity: ActivitySummary[];
};

function fallbackSnapshot(): AdminSnapshot {
  return {
    metrics: mockMetrics,
    tests: mockTests,
    participants: mockParticipants,
    sessions: mockSessions,
    attempts: mockAttempts,
    activity: mockActivity,
  };
}

export async function getAdminSnapshot(): Promise<AdminSnapshot> {
  if (!process.env.DATABASE_URL) {
    return fallbackSnapshot();
  }

  try {
    const [tests, participants, sessions, attempts, activity, testsCount, participantsCount, sessionsToday, scoredToday] =
      await Promise.all([
        prisma.test.findMany({
          orderBy: { updatedAt: "desc" },
          take: 6,
          include: {
            _count: {
              select: {
                forms: true,
                attempts: true,
              },
            },
          },
        }),
        prisma.participant.findMany({
          orderBy: { updatedAt: "desc" },
          take: 6,
          include: {
            _count: {
              select: {
                assignments: true,
                attempts: true,
              },
            },
          },
        }),
        prisma.session.findMany({
          orderBy: { startedAt: "desc" },
          take: 6,
          include: {
            participant: true,
            test: true,
          },
        }),
        prisma.attempt.findMany({
          orderBy: { updatedAt: "desc" },
          take: 6,
          include: {
            participant: true,
            test: true,
          },
        }),
        prisma.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 6,
        }),
        prisma.test.count(),
        prisma.participant.count(),
        prisma.session.count({
          where: {
            startedAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),
        prisma.attempt.count({
          where: {
            status: AttemptStatus.SCORED,
          },
        }),
      ]);

    if (testsCount === 0) {
      return fallbackSnapshot();
    }

    return {
      metrics: [
        {
          label: "Proves actives",
          value: `${tests.filter((item) => item.status === TestStatus.ACTIVE).length}`,
          detail: `${testsCount} proves totals disponibles a la plataforma`,
        },
        {
          label: "Participants registrats",
          value: `${participantsCount}`,
          detail: "cens actual registrat a la plataforma",
        },
        {
          label: "Sessions avui",
          value: `${sessionsToday}`,
          detail: "comptador operatiu de sessions iniciades avui",
        },
        {
          label: "Resultats revisats",
          value: `${scoredToday}`,
          detail: "intents ja puntuats i llestos per consulta",
        },
      ],
      tests: tests.map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        status: item.status,
        estimatedMinutes: item.estimatedMinutes,
        forms: item._count.forms,
        attempts: item._count.attempts,
        scoreModel: item.scoreModel,
        deliveryMode: item.deliveryMode,
        updatedAt: item.updatedAt.toISOString(),
      })),
      participants: participants.map((item) => ({
        id: item.id,
        publicCode: item.publicCode,
        homeRegion: item.homeRegion ?? "No informat",
        catalanProfile: item.catalanProfile ?? "pendent",
        lastSeenAt: item.lastSeenAt?.toISOString() ?? item.updatedAt.toISOString(),
        assignments: item._count.assignments,
        completionRate:
          item._count.assignments === 0
            ? "0%"
            : `${Math.round((item._count.attempts / item._count.assignments) * 100)}%`,
      })),
      sessions: sessions.map((item) => ({
        id: item.id,
        participantCode: item.participant.publicCode,
        testName: item.test?.name ?? "Sense test",
        status: item.status,
        deviceGroup: item.deviceGroup ?? "unknown",
        startedAt: item.startedAt.toISOString(),
        endedAt: item.endedAt?.toISOString(),
      })),
      attempts: attempts.map((item) => ({
        id: item.id,
        participantCode: item.participant.publicCode,
        testName: item.test.name,
        status: item.status,
        score: item.score ?? undefined,
        dPrime: item.dPrime ?? undefined,
        accuracy: item.accuracy ?? undefined,
        submittedAt: item.submittedAt?.toISOString(),
      })),
      activity: activity.map((item) => ({
        id: item.id,
        action: item.action,
        summary: item.summary,
        actorEmail: item.actorEmail ?? "system",
        createdAt: item.createdAt.toISOString(),
      })),
    };
  } catch {
    return fallbackSnapshot();
  }
}

export function getStatusTone(status: string) {
  switch (status) {
    case TestStatus.ACTIVE:
    case SessionStatus.FINISHED:
    case AttemptStatus.SCORED:
      return "success";
    case SessionStatus.LIVE:
    case AttemptStatus.IN_PROGRESS:
      return "info";
    case AttemptStatus.FLAGGED:
    case SessionStatus.EXPIRED:
      return "warning";
    default:
      return "neutral";
  }
}
