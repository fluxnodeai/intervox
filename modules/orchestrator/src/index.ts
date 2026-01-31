/**
 * Orchestrator Module
 *
 * Central coordinator that manages the full investigation pipeline:
 * 1. Receive investigation request
 * 2. Find identity candidates
 * 3. Await user confirmation
 * 4. Trigger comprehensive scraping
 * 5. Build persona
 * 6. Return ready-to-converse persona
 */

import { config } from "@/shared/config";
import Anthropic from "@anthropic-ai/sdk";
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
  scrapeAll,
  getAvailableSources,
} from "@/modules/scraper-swarm/src";
import { buildPersona } from "@/modules/persona-engine/src";

// Initialize Anthropic client for orchestration logic
const anthropic = new Anthropic({
  apiKey: config.anthropic.apiKey,
});

// In-memory store for investigations (in production, use a database)
const investigations = new Map<string, InvestigationResult>();

// ============================================
// Investigation Pipeline
// ============================================

/**
 * Start a new investigation
 * Returns candidates for identity confirmation
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

  // Find identity candidates
  try {
    const candidates = await findIdentityCandidates(
      request.targetName,
      request.targetContext
    );

    investigation.identityCandidates = candidates;

    // If only one high-confidence match, we might auto-confirm
    // But for safety, always ask for confirmation
  } catch (error) {
    investigation.status = "error";
    investigation.error =
      error instanceof Error ? error.message : "Failed to find candidates";
  }

  // Store and return
  investigations.set(targetId, investigation);
  return investigation;
}

/**
 * Confirm identity and proceed with full investigation
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
    investigation.status = "error";
    investigation.error = "Identity not confirmed";
    return investigation;
  }

  // Find the confirmed candidate
  const confirmedCandidate = investigation.identityCandidates?.find(
    (c) => c.id === confirmation.selectedCandidateId
  );

  if (!confirmedCandidate) {
    // If no specific candidate selected, use the first one with additional context
    investigation.confirmedIdentity = {
      id: uuidv4(),
      name: investigation.targetName,
      description: confirmation.additionalContext || "",
      confidence: 70,
      sources: [],
    };
  } else {
    investigation.confirmedIdentity = confirmedCandidate;
  }

  // Update status and start scraping
  investigation.status = "scraping";
  investigations.set(targetId, investigation);

  // Run the full investigation asynchronously
  runFullInvestigation(targetId).catch((error) => {
    console.error(`Investigation ${targetId} failed:`, error);
    investigation.status = "error";
    investigation.error =
      error instanceof Error ? error.message : "Investigation failed";
    investigations.set(targetId, investigation);
  });

  return investigation;
}

/**
 * Run the full investigation pipeline (scraping + persona building)
 */
async function runFullInvestigation(targetId: string): Promise<void> {
  const investigation = investigations.get(targetId);
  if (!investigation || !investigation.confirmedIdentity) return;

  // Scrape all sources
  const sources = getAvailableSources();

  try {
    const scrapedData = await scrapeAll({
      targetName: investigation.targetName,
      sources,
      confirmedIdentity: investigation.confirmedIdentity,
    });

    investigation.scrapedData = scrapedData;
    investigation.sourcesScraped = scrapedData.length;
    investigation.dataPoints = countDataPoints(scrapedData);
    investigation.status = "building_persona";
    investigations.set(targetId, investigation);

    // Build persona from scraped data
    const persona = await buildPersona(
      investigation.targetId,
      investigation.targetName,
      scrapedData
    );

    investigation.persona = persona;
    investigation.status = "ready";
    investigations.set(targetId, investigation);
  } catch (error) {
    investigation.status = "error";
    investigation.error =
      error instanceof Error ? error.message : "Investigation failed";
    investigations.set(targetId, investigation);
  }
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
      (d.quotes?.length || 0) +
      (d.opinions?.length || 0) +
      (d.education?.length || 0) +
      (d.workHistory?.length || 0) +
      (d.skills?.length || 0)
    );
  }, 0);
}

/**
 * Quick scrape for demo - skip identity confirmation
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

  // Determine sources based on depth
  let sources = getAvailableSources();
  if (request.depth === "quick") {
    sources = ["google", "linkedin", "twitter"];
  } else if (request.depth === "standard") {
    sources = ["google", "linkedin", "twitter", "wikipedia", "news"];
  }

  try {
    const scrapedData = await scrapeAll({
      targetName: request.targetName,
      targetContext: request.targetContext,
      sources,
    });

    investigation.scrapedData = scrapedData;
    investigation.sourcesScraped = scrapedData.length;
    investigation.dataPoints = countDataPoints(scrapedData);
    investigation.status = "building_persona";

    const persona = await buildPersona(targetId, request.targetName, scrapedData);

    investigation.persona = persona;
    investigation.status = "ready";
  } catch (error) {
    investigation.status = "error";
    investigation.error =
      error instanceof Error ? error.message : "Investigation failed";
  }

  investigations.set(targetId, investigation);
  return investigation;
}
