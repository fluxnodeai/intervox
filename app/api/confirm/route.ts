/**
 * POST /api/confirm
 * Confirm identity and proceed with investigation
 */

import { NextRequest, NextResponse } from "next/server";
import { confirmIdentity } from "@/modules/orchestrator/src";
import { IdentityConfirmation } from "@/shared/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { targetId, confirmed, selectedCandidateId, additionalContext } = body;

    if (!targetId) {
      return NextResponse.json(
        { error: "targetId is required" },
        { status: 400 }
      );
    }

    const confirmation: IdentityConfirmation = {
      confirmed: confirmed ?? true,
      selectedCandidateId,
      additionalContext,
    };

    const result = await confirmIdentity(targetId, confirmation);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Confirmation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Confirmation failed" },
      { status: 500 }
    );
  }
}
