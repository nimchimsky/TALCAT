import { notFound, redirect } from "next/navigation";

import { AdaptiveTestRunner } from "@/components/adaptive-test-runner";
import { PublicTestRunner } from "@/components/public-test-runner";
import { getAttemptSession } from "@/lib/public-data";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    attemptId: string;
  }>;
};

export default async function SessionPage({ params }: Props) {
  const { attemptId } = await params;
  const session = await getAttemptSession(attemptId);

  if (!session) {
    notFound();
  }

  if (session.items.length === 0) {
    if (session.deliveryMode !== "adaptive") {
      redirect("/");
    }
  }

  return (
    <div className="mx-auto w-full max-w-[980px] px-4 py-6 sm:px-6 sm:py-10">
      {session.deliveryMode === "adaptive" ? (
        <AdaptiveTestRunner
          attemptId={session.attemptId}
          participantCode={session.participantCode}
          participantName={session.participantName}
        />
      ) : (
        <PublicTestRunner
          attemptId={session.attemptId}
          participantCode={session.participantCode}
          participantName={session.participantName}
          testName={session.testName}
          formLabel={session.formLabel}
          items={session.items}
        />
      )}
    </div>
  );
}
