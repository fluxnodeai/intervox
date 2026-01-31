/**
 * POST /api/chat
 * Send a message to the persona
 */

import { NextRequest, NextResponse } from "next/server";
import {
  startConversation,
  chat,
  getConversation,
} from "@/modules/voice-interface/src";
import { getInvestigationStatus } from "@/modules/orchestrator/src";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetId, sessionId, message } = body;

    if (!message) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    let currentSessionId = sessionId;

    // If no session, create one
    if (!currentSessionId && targetId) {
      const investigation = await getInvestigationStatus(targetId);

      if (!investigation?.persona) {
        return NextResponse.json(
          { error: "Persona not ready" },
          { status: 400 }
        );
      }

      const session = await startConversation(investigation.persona);
      currentSessionId = session.id;
    }

    if (!currentSessionId) {
      return NextResponse.json(
        { error: "targetId or sessionId is required" },
        { status: 400 }
      );
    }

    // Send message and get response
    const response = await chat(currentSessionId, message);

    // Get full conversation
    const conversation = getConversation(currentSessionId);

    return NextResponse.json({
      sessionId: currentSessionId,
      response,
      conversation,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 500 }
    );
  }
}
