/**
 * Centralized Logger for INTERVOX
 *
 * Emits structured log events that can be:
 * 1. Written to console
 * 2. Streamed to frontend via SSE
 * 3. Stored for debugging
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogCategory =
  | 'orchestrator'
  | 'scraper'
  | 'persona'
  | 'voice'
  | 'api'
  | 'system';

export interface LogEvent {
  id: string;
  timestamp: Date;
  level: LogLevel;
  category: LogCategory;
  message: string;
  details?: Record<string, any>;
  targetId?: string;
}

// In-memory event store per investigation
const eventStores = new Map<string, LogEvent[]>();
const eventListeners = new Map<string, Set<(event: LogEvent) => void>>();
const globalListeners = new Set<(event: LogEvent) => void>();

// Maximum events per investigation (prevent memory bloat)
const MAX_EVENTS = 500;

/**
 * Generate unique event ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Log an event
 */
export function log(
  level: LogLevel,
  category: LogCategory,
  message: string,
  details?: Record<string, any>,
  targetId?: string
): LogEvent {
  const event: LogEvent = {
    id: generateId(),
    timestamp: new Date(),
    level,
    category,
    message,
    details,
    targetId,
  };

  // Console output with color
  const colors = {
    debug: '\x1b[90m',
    info: '\x1b[36m',
    warn: '\x1b[33m',
    error: '\x1b[31m',
  };
  const reset = '\x1b[0m';
  const categoryColor = '\x1b[35m';

  console.log(
    `${colors[level]}[${level.toUpperCase()}]${reset} ${categoryColor}[${category}]${reset} ${message}`,
    details ? JSON.stringify(details) : ''
  );

  // Store event
  if (targetId) {
    let store = eventStores.get(targetId);
    if (!store) {
      store = [];
      eventStores.set(targetId, store);
    }
    store.push(event);

    // Trim if too large
    if (store.length > MAX_EVENTS) {
      store.shift();
    }

    // Notify target-specific listeners
    const listeners = eventListeners.get(targetId);
    if (listeners) {
      listeners.forEach(listener => listener(event));
    }
  }

  // Notify global listeners
  globalListeners.forEach(listener => listener(event));

  return event;
}

// Convenience methods
export const logger = {
  debug: (category: LogCategory, message: string, details?: Record<string, any>, targetId?: string) =>
    log('debug', category, message, details, targetId),

  info: (category: LogCategory, message: string, details?: Record<string, any>, targetId?: string) =>
    log('info', category, message, details, targetId),

  warn: (category: LogCategory, message: string, details?: Record<string, any>, targetId?: string) =>
    log('warn', category, message, details, targetId),

  error: (category: LogCategory, message: string, details?: Record<string, any>, targetId?: string) =>
    log('error', category, message, details, targetId),

  // Scraper-specific logging
  scraper: {
    start: (targetId: string, targetName: string) =>
      log('info', 'scraper', `Starting deep scrape for "${targetName}"`, { targetName }, targetId),

    source: (targetId: string, source: string, url: string) =>
      log('info', 'scraper', `Scraping ${source}`, { source, url }, targetId),

    extracted: (targetId: string, source: string, dataPoints: number) =>
      log('info', 'scraper', `Extracted ${dataPoints} data points from ${source}`, { source, dataPoints }, targetId),

    complete: (targetId: string, totalSources: number, totalDataPoints: number) =>
      log('info', 'scraper', `Scraping complete: ${totalSources} sources, ${totalDataPoints} data points`,
        { totalSources, totalDataPoints }, targetId),

    error: (targetId: string, source: string, error: string) =>
      log('error', 'scraper', `Failed to scrape ${source}: ${error}`, { source, error }, targetId),
  },

  // Orchestrator-specific logging
  orchestrator: {
    start: (targetId: string, targetName: string) =>
      log('info', 'orchestrator', `Investigation started for "${targetName}"`, { targetName, targetId }, targetId),

    findingCandidates: (targetId: string) =>
      log('info', 'orchestrator', 'Searching for identity candidates...', {}, targetId),

    candidatesFound: (targetId: string, count: number) =>
      log('info', 'orchestrator', `Found ${count} identity candidates`, { count }, targetId),

    identityConfirmed: (targetId: string, name: string) =>
      log('info', 'orchestrator', `Identity confirmed: ${name}`, { name }, targetId),

    buildingPersona: (targetId: string) =>
      log('info', 'persona', 'Building AI persona from scraped data...', {}, targetId),

    personaReady: (targetId: string, name: string) =>
      log('info', 'persona', `Persona ready for ${name}`, { name }, targetId),

    ready: (targetId: string) =>
      log('info', 'orchestrator', 'Investigation complete! Ready for conversation.', {}, targetId),

    error: (targetId: string, error: string) =>
      log('error', 'orchestrator', `Investigation failed: ${error}`, { error }, targetId),
  },

  // Voice-specific logging
  voice: {
    sessionStart: (targetId: string, personaName: string, voiceId: string) =>
      log('info', 'voice', `Voice session started for ${personaName}`, { personaName, voiceId }, targetId),

    messageReceived: (targetId: string, message: string) =>
      log('debug', 'voice', `User: "${message.substring(0, 50)}..."`, { message }, targetId),

    responseGenerated: (targetId: string, response: string) =>
      log('debug', 'voice', `AI: "${response.substring(0, 50)}..."`, { response }, targetId),

    ttsComplete: (targetId: string, durationMs: number) =>
      log('debug', 'voice', `TTS generated in ${durationMs}ms`, { durationMs }, targetId),
  },
};

/**
 * Get all events for an investigation
 */
export function getEvents(targetId: string): LogEvent[] {
  return eventStores.get(targetId) || [];
}

/**
 * Subscribe to events for a specific investigation
 */
export function subscribe(targetId: string, callback: (event: LogEvent) => void): () => void {
  let listeners = eventListeners.get(targetId);
  if (!listeners) {
    listeners = new Set();
    eventListeners.set(targetId, listeners);
  }
  listeners.add(callback);

  // Return unsubscribe function
  return () => {
    listeners?.delete(callback);
  };
}

/**
 * Subscribe to all events globally
 */
export function subscribeAll(callback: (event: LogEvent) => void): () => void {
  globalListeners.add(callback);
  return () => {
    globalListeners.delete(callback);
  };
}

/**
 * Clear events for an investigation
 */
export function clearEvents(targetId: string): void {
  eventStores.delete(targetId);
}
