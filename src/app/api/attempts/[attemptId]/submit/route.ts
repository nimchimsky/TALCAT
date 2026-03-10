import { NextResponse } from "next/server";

import { submitAttempt } from "@/lib/public-data";

type Props = {
  params: Promise<{
    attemptId: string;
  }>;
};

export async function POST(request: Request, { params }: Props) {
  try {
    const { attemptId } = await params;
    const payload = (await request.json()) as {
      responses?: Array<{
        itemId: string;
        position: number;
        answerBoolean: boolean;
        rtMs: number;
      }>;
    };

    const result = await submitAttempt(attemptId, payload.responses ?? []);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No s'ha pogut desar la prova.",
      },
      { status: 400 },
    );
  }
}
