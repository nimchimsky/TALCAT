import { NextResponse } from "next/server";

import { getAdaptiveAttemptState } from "@/lib/public-data";

type Props = {
  params: Promise<{
    attemptId: string;
  }>;
};

export async function GET(_request: Request, { params }: Props) {
  try {
    const { attemptId } = await params;
    const state = await getAdaptiveAttemptState(attemptId);

    if (!state) {
      return NextResponse.json(
        {
          error: "No s'ha trobat aquest intent adaptatiu.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(state);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No s'ha pogut llegir l'estat de la prova.",
      },
      { status: 400 },
    );
  }
}
