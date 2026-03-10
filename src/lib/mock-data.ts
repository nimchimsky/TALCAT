export type Metric = {
  label: string;
  value: string;
  detail: string;
};

export type TestSummary = {
  id: string;
  name: string;
  slug: string;
  status: string;
  estimatedMinutes: number;
  forms: number;
  attempts: number;
  scoreModel: string;
  deliveryMode: string;
  updatedAt: string;
};

export type ParticipantSummary = {
  id: string;
  publicCode: string;
  homeRegion: string;
  catalanProfile: string;
  lastSeenAt: string;
  assignments: number;
  completionRate: string;
};

export type SessionSummary = {
  id: string;
  participantCode: string;
  testName: string;
  status: string;
  deviceGroup: string;
  startedAt: string;
  endedAt?: string;
};

export type AttemptSummary = {
  id: string;
  participantCode: string;
  testName: string;
  status: string;
  score?: number;
  dPrime?: number;
  accuracy?: number;
  submittedAt?: string;
};

export type ActivitySummary = {
  id: string;
  action: string;
  summary: string;
  actorEmail: string;
  createdAt: string;
};

export const mockMetrics: Metric[] = [
  {
    label: "Proves actives",
    value: "3",
    detail: "2 en produccio i 1 bateria de validacio en preparacio",
  },
  {
    label: "Participants registrats",
    value: "1.248",
    detail: "captura combinada de cohorts natius, L2 i control",
  },
  {
    label: "Sessions avui",
    value: "94",
    detail: "78 tancades, 12 en curs i 4 pendents de revisio",
  },
  {
    label: "Resultats revisats",
    value: "87%",
    detail: "els casos marcats entren a cua de control en menys de 24 h",
  },
];

export const mockTests: TestSummary[] = [
  {
    id: "test-1",
    name: "TALCAT Adaptive Pilot",
    slug: "talcat-adaptive-pilot",
    status: "ACTIVE",
    estimatedMinutes: 8,
    forms: 6,
    attempts: 842,
    scoreModel: "1pl",
    deliveryMode: "adaptive-with-fixed_fallback",
    updatedAt: "2026-03-10T07:45:00.000Z",
  },
  {
    id: "test-2",
    name: "Validation battery",
    slug: "validation-battery-a",
    status: "DRAFT",
    estimatedMinutes: 15,
    forms: 1,
    attempts: 0,
    scoreModel: "research-bundle",
    deliveryMode: "supervised",
    updatedAt: "2026-03-09T18:20:00.000Z",
  },
];

export const mockParticipants: ParticipantSummary[] = [
  {
    id: "participant-1",
    publicCode: "CAT-24031",
    homeRegion: "Barcelona",
    catalanProfile: "natiu",
    lastSeenAt: "2026-03-10T08:11:00.000Z",
    assignments: 4,
    completionRate: "100%",
  },
  {
    id: "participant-2",
    publicCode: "CAT-24032",
    homeRegion: "Girona",
    catalanProfile: "L2 avancat",
    lastSeenAt: "2026-03-10T09:19:00.000Z",
    assignments: 2,
    completionRate: "50%",
  },
  {
    id: "participant-3",
    publicCode: "CAT-24033",
    homeRegion: "Lleida",
    catalanProfile: "natiu",
    lastSeenAt: "2026-03-10T07:20:00.000Z",
    assignments: 3,
    completionRate: "67%",
  },
  {
    id: "participant-4",
    publicCode: "CAT-24034",
    homeRegion: "Tarragona",
    catalanProfile: "bilingue dominant catala",
    lastSeenAt: "2026-03-09T19:52:00.000Z",
    assignments: 1,
    completionRate: "100%",
  },
];

export const mockSessions: SessionSummary[] = [
  {
    id: "session-1",
    participantCode: "CAT-24032",
    testName: "TALCAT Adaptive Pilot",
    status: "LIVE",
    deviceGroup: "desktop",
    startedAt: "2026-03-10T09:19:00.000Z",
  },
  {
    id: "session-2",
    participantCode: "CAT-24031",
    testName: "TALCAT Adaptive Pilot",
    status: "FINISHED",
    deviceGroup: "mobile",
    startedAt: "2026-03-10T08:03:00.000Z",
    endedAt: "2026-03-10T08:11:00.000Z",
  },
  {
    id: "session-3",
    participantCode: "CAT-24035",
    testName: "TALCAT Adaptive Pilot",
    status: "PENDING",
    deviceGroup: "mobile",
    startedAt: "2026-03-10T10:20:00.000Z",
  },
];

export const mockAttempts: AttemptSummary[] = [
  {
    id: "attempt-1",
    participantCode: "CAT-24031",
    testName: "TALCAT Adaptive Pilot",
    status: "SCORED",
    score: 612,
    dPrime: 2.11,
    accuracy: 0.89,
    submittedAt: "2026-03-10T08:11:00.000Z",
  },
  {
    id: "attempt-2",
    participantCode: "CAT-24032",
    testName: "TALCAT Adaptive Pilot",
    status: "IN_PROGRESS",
    dPrime: 1.16,
    accuracy: 0.71,
  },
  {
    id: "attempt-3",
    participantCode: "CAT-24034",
    testName: "TALCAT Adaptive Pilot",
    status: "FLAGGED",
    score: 431,
    dPrime: 0.94,
    accuracy: 0.63,
    submittedAt: "2026-03-09T19:55:00.000Z",
  },
];

export const mockActivity: ActivitySummary[] = [
  {
    id: "activity-1",
    action: "test.activated",
    summary: "Activat el cataleg operatiu del pilot adaptatiu TALCAT.",
    actorEmail: "admin@example.com",
    createdAt: "2026-03-10T07:45:00.000Z",
  },
  {
    id: "activity-2",
    action: "result.reviewed",
    summary: "Revisat un resultat alt amb falsa alarma controlada.",
    actorEmail: "psychometrics@example.com",
    createdAt: "2026-03-10T08:20:00.000Z",
  },
  {
    id: "activity-3",
    action: "session.flagged",
    summary: "Sessio en curs marcada per criteri conservador elevat.",
    actorEmail: "admin@example.com",
    createdAt: "2026-03-10T09:22:00.000Z",
  },
];
