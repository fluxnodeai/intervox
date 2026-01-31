/**
 * POST /api/investigate
 * Start a new investigation
 */

import { NextRequest, NextResponse } from "next/server";
import {
  startInvestigation,
  quickInvestigate,
} from "@/modules/orchestrator/src";
import { InvestigationRequest } from "@/shared/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const investigationRequest: InvestigationRequest = {
      targetName: body.targetName,
      targetContext: body.targetContext,
      depth: body.depth || "standard",
    };

    if (!investigationRequest.targetName) {
      return NextResponse.json(
        { error: "targetName is required" },
        { status: 400 }
      );
    }

    // Use quick mode if specified (skips identity confirmation)
    if (body.quickMode) {
      const result = await quickInvestigate(investigationRequest);
      return NextResponse.json(result);
    }

    // Standard mode with identity confirmation
    const result = await startInvestigation(investigationRequest);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Investigation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Investigation failed" },
      { status: 500 }
    );
  }
}
