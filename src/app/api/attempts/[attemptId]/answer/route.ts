import { NextResponse } from "next/server";

import { submitAdaptiveAnswer } from "@/lib/public-data";

type Props = {
  params: Promise<{
    attemptId: string;
  }>;
};

export async function POST(request: Request, { params }: Props) {
  try {
    const { attemptId } = await params;
    const payload = (await request.json()) as {
      answerBoolean?: boolean;
      rtMs?: number;
    };

    const result = await submitAdaptiveAnswer(attemptId, {
      answerBoolean: Boolean(payload.answerBoolean),
      rtMs:
        typeof payload.rtMs === "number" && Number.isFinite(payload.rtMs)
          ? payload.rtMs
          : 0,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No s'ha pogut registrar la resposta adaptativa.",
      },
      { status: 400 },
    );
  }
}
