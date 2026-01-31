/**
 * GET /api/status/[targetId]
 * Get investigation status
 */

import { NextRequest, NextResponse } from "next/server";
import { getInvestigationStatus } from "@/modules/orchestrator/src";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ targetId: string }> }
) {
  try {
    const { targetId } = await params;

    const result = await getInvestigationStatus(targetId);

    if (!result) {
      return NextResponse.json(
        { error: "Investigation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Status error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Status check failed" },
      { status: 500 }
    );
  }
}
