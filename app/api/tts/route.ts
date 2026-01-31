/**
 * POST /api/tts
 * Convert text to speech
 */

import { NextRequest, NextResponse } from "next/server";
import { textToSpeech } from "@/modules/voice-interface/src";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voiceId } = body;

    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const audio = await textToSpeech(text, voiceId ? { voiceId } : undefined);

    // Return audio as binary - convert Buffer to Uint8Array for NextResponse
    return new NextResponse(new Uint8Array(audio), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audio.length.toString(),
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "TTS failed" },
      { status: 500 }
    );
  }
}
