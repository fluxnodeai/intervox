/**
 * GET /api/events/[targetId]
 * Server-Sent Events endpoint for real-time investigation logs
 */

import { NextRequest } from "next/server";
import { getEvents, subscribe, LogEvent } from "@/shared/logger";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ targetId: string }> }
) {
  const { targetId } = await params;

  // Create a readable stream for SSE
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send existing events first
      const existingEvents = getEvents(targetId);
      for (const event of existingEvents) {
        const data = `data: ${JSON.stringify(formatEvent(event))}\n\n`;
        controller.enqueue(encoder.encode(data));
      }

      // Subscribe to new events
      const unsubscribe = subscribe(targetId, (event: LogEvent) => {
        try {
          const data = `data: ${JSON.stringify(formatEvent(event))}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch (e) {
          // Stream closed
          unsubscribe();
        }
      });

      // Keep connection alive with heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch (e) {
          clearInterval(heartbeat);
          unsubscribe();
        }
      }, 15000);

      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

function formatEvent(event: LogEvent) {
  return {
    id: event.id,
    timestamp: event.timestamp.toISOString(),
    level: event.level,
    category: event.category,
    message: event.message,
    details: event.details,
  };
}
