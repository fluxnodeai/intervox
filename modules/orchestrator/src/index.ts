/**
 * Orchestrator Module
 *
 * Central coordinator for the full investigation pipeline:
 * 1. Receive name input
 * 2. Find identity candidates via rtrvr.ai
 * 3. User confirms identity
 * 4. Deep scrape 100+ pages
 * 5. Build persona
 * 6. Enable voice conversation
 */

import { config } from "@/shared/config";
import { v4 as uuidv4 } from "uuid";
import {
  InvestigationRequest,
  InvestigationResult,
  IdentityCandidate,
  IdentityConfirmation,
  ScrapedData,
  PersonaModel,
} from "@/shared/types";
import {
  findIdentityCandidates,
  deepScrape,
  getAvailableSources,
  ScrapingProgress,
} from "@/modules/scraper-swarm/src";
import { buildPersona } from "@/modules/persona-engine/src";
import { startConversation } from "@/modules/voice-interface/src";

// In-memory store for investigations
const investigations = new Map<string, InvestigationResult>();
const progressCallbacks = new Map<string, (progress: ScrapingProgress) => void>();

// ============================================
// Investigation Pipeline
// ============================================

/**
 * Start a new investigation
 * First step: Find identity candidates for confirmation
 */
export async function startInvestigation(
  request: InvestigationRequest
): Promise<InvestigationResult> {
  const targetId = uuidv4();

  // Create initial investigation record
  const investigation: InvestigationResult = {
    targetId,
    targetName: request.targetName,
    status: "confirming_identity",
    sourcesScraped: 0,
    dataPoints: 0,
    scrapedData: [],
  };

  // Find identity candidates using rtrvr.ai
  try {
    console.log(`Starting investigation for: ${request.targetName}`);
    const candidates = await findIdentityCandidates(
      request.targetName,
      request.targetContext
    );

    investigation.identityCandidates = candidates;
    console.log(`Found ${candidates.length} candidates`);
  } catch (error) {
    console.error('Error finding candidates:', error);
    investigation.status = "error";
    investigation.error =
      error instanceof Error ? error.message : "Failed to find candidates";
  }

  // Store and return
  investigations.set(targetId, investigation);
  return investigation;
}

/**
 * Confirm identity and proceed with deep investigation
 */
export async function confirmIdentity(
  targetId: string,
  confirmation: IdentityConfirmation
): Promise<InvestigationResult> {
  const investigation = investigations.get(targetId);

  if (!investigation) {
    throw new Error(`Investigation ${targetId} not found`);
  }

  if (!confirmation.confirmed) {
    // User said no - they can provide additional context
    if (confirmation.additionalContext) {
      // Re-search with additional context
      const candidates = await findIdentityCandidates(
        investigation.targetName,
        confirmation.additionalContext
      );
      investigation.identityCandidates = candidates;
      investigation.status = "confirming_identity";
    } else {
      investigation.status = "error";
      investigation.error = "Identity not confirmed";
    }
    investigations.set(targetId, investigation);
    return investigation;
  }

  // Find the confirmed candidate
  const confirmedCandidate = investigation.identityCandidates?.find(
    (c) => c.id === confirmation.selectedCandidateId
  );

  if (!confirmedCandidate && !confirmation.additionalContext) {
    investigation.status = "error";
    investigation.error = "No candidate selected";
    investigations.set(targetId, investigation);
    return investigation;
  }

  // Set confirmed identity
  investigation.confirmedIdentity = confirmedCandidate || {
    id: uuidv4(),
    name: investigation.targetName,
    description: confirmation.additionalContext || "",
    confidence: 70,
    sources: [],
  };

  // Update status and start deep scraping
  investigation.status = "scraping";
  investigations.set(targetId, investigation);

  console.log(`Identity confirmed: ${investigation.confirmedIdentity.name}`);
  console.log(`Starting deep scrape...`);

  // Run the full investigation asynchronously
  runFullInvestigation(targetId).catch((error) => {
    console.error(`Investigation ${targetId} failed:`, error);
    const inv = investigations.get(targetId);
    if (inv) {
      inv.status = "error";
      inv.error = error instanceof Error ? error.message : "Investigation failed";
      investigations.set(targetId, inv);
    }
  });

  return investigation;
}

/**
 * Run the full investigation pipeline
 */
async function runFullInvestigation(targetId: string): Promise<void> {
  const investigation = investigations.get(targetId);
  if (!investigation || !investigation.confirmedIdentity) return;

  try {
    // Deep scrape with progress callback
    const scrapedData = await deepScrape(
      investigation.targetName,
      investigation.confirmedIdentity,
      (progress) => {
        // Update investigation with progress
        investigation.sourcesScraped = progress.scrapedPages;
        investigation.dataPoints = countDataPoints(investigation.scrapedData);

        // Notify any listeners
        const callback = progressCallbacks.get(targetId);
        if (callback) {
          callback(progress);
        }

        investigations.set(targetId, investigation);
      }
    );

    investigation.scrapedData = scrapedData;
    investigation.sourcesScraped = scrapedData.length;
    investigation.dataPoints = countDataPoints(scrapedData);
    investigation.status = "building_persona";
    investigations.set(targetId, investigation);

    console.log(`Scraped ${scrapedData.length} sources, ${investigation.dataPoints} data points`);
    console.log(`Building persona...`);

    // Build persona from scraped data
    const persona = await buildPersona(
      investigation.targetId,
      investigation.targetName,
      scrapedData
    );

    investigation.persona = persona;
    investigation.status = "ready";

    // Pre-create conversation session
    const session = await startConversation(persona);
    investigation.conversationId = session.id;

    investigations.set(targetId, investigation);
    console.log(`Investigation complete. Persona ready for conversation.`);

  } catch (error) {
    console.error('Investigation error:', error);
    investigation.status = "error";
    investigation.error = error instanceof Error ? error.message : "Investigation failed";
    investigations.set(targetId, investigation);
  }
}

/**
 * Register a progress callback for an investigation
 */
export function onProgress(
  targetId: string,
  callback: (progress: ScrapingProgress) => void
): void {
  progressCallbacks.set(targetId, callback);
}

/**
 * Unregister progress callback
 */
export function offProgress(targetId: string): void {
  progressCallbacks.delete(targetId);
}

/**
 * Get the current status of an investigation
 */
export async function getInvestigationStatus(
  targetId: string
): Promise<InvestigationResult | null> {
  return investigations.get(targetId) || null;
}

/**
 * Count total data points across all scraped data
 */
function countDataPoints(data: ScrapedData[]): number {
  return data.reduce((count, item) => {
    const d = item.data;
    return (
      count +
      (d.fullName ? 1 : 0) +
      (d.currentRole ? 1 : 0) +
      (d.company ? 1 : 0) +
      (d.bio ? 1 : 0) +
      (d.location ? 1 : 0) +
      (d.quotes?.length || 0) +
      (d.opinions?.length || 0) +
      (d.education?.length || 0) +
      (d.workHistory?.length || 0) +
      (d.skills?.length || 0)
    );
  }, 0);
}

/**
 * Quick investigate - for demos, skip identity confirmation
 */
export async function quickInvestigate(
  request: InvestigationRequest
): Promise<InvestigationResult> {
  const targetId = uuidv4();

  const investigation: InvestigationResult = {
    targetId,
    targetName: request.targetName,
    status: "scraping",
    sourcesScraped: 0,
    dataPoints: 0,
    scrapedData: [],
    confirmedIdentity: {
      id: uuidv4(),
      name: request.targetName,
      description: request.targetContext || "",
      confidence: 80,
      sources: [],
    },
  };

  investigations.set(targetId, investigation);

  // Run investigation in background
  runFullInvestigation(targetId).catch(console.error);

  return investigation;
}

/**
 * Get all investigations (for debugging)
 */
export function getAllInvestigations(): InvestigationResult[] {
  return Array.from(investigations.values());
}
