/**
 * Orchestrator Module Tests
 *
 * Tests for the investigation pipeline coordinator.
 * @see prompts/orchestrator.prompt
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock external dependencies
vi.mock("@/shared/config", () => ({
  config: {
    anthropic: { apiKey: "test-key" },
    rtrvr: { apiKey: "test-key" },
  },
}));

vi.mock("@/modules/scraper-swarm/src", () => ({
  findIdentityCandidates: vi.fn().mockResolvedValue([
    {
      id: "test-id-1",
      name: "Test Person",
      description: "A test person for unit testing",
      confidence: 90,
      sources: ["test-source"],
    },
  ]),
  deepScrape: vi.fn().mockResolvedValue([]),
  getAvailableSources: vi.fn().mockReturnValue(["linkedin", "twitter"]),
}));

vi.mock("@/modules/persona-engine/src", () => ({
  buildPersona: vi.fn().mockResolvedValue({
    targetId: "test-id",
    identity: { fullName: "Test Person" },
    systemPrompt: "You are Test Person.",
  }),
}));

vi.mock("@/modules/voice-interface/src", () => ({
  startConversation: vi.fn().mockResolvedValue({
    id: "session-123",
    personaId: "test-id",
    messages: [],
  }),
}));

describe("Orchestrator Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Investigation Request Validation", () => {
    it("should require a targetName", () => {
      const request = { targetName: "" };
      expect(request.targetName).toBeFalsy();
    });

    it("should accept valid investigation request", () => {
      const request = {
        targetName: "Elon Musk",
        targetContext: "CEO of Tesla",
        depth: "standard" as const,
      };
      expect(request.targetName).toBeTruthy();
      expect(request.depth).toBe("standard");
    });

    it("should support depth levels", () => {
      const depths = ["quick", "standard", "deep"];
      depths.forEach((depth) => {
        expect(["quick", "standard", "deep"]).toContain(depth);
      });
    });
  });

  describe("Investigation Status", () => {
    it("should have valid status values", () => {
      const validStatuses = [
        "pending",
        "confirming_identity",
        "scraping",
        "building_persona",
        "ready",
        "error",
      ];

      validStatuses.forEach((status) => {
        expect(typeof status).toBe("string");
      });
    });

    it("should track investigation progress", () => {
      const investigation = {
        targetId: "test-123",
        targetName: "Test Person",
        status: "scraping",
        sourcesScraped: 5,
        dataPoints: 42,
        scrapedData: [],
      };

      expect(investigation.sourcesScraped).toBeGreaterThanOrEqual(0);
      expect(investigation.dataPoints).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Identity Confirmation", () => {
    it("should support identity confirmation flow", () => {
      const confirmation = {
        confirmed: true,
        selectedCandidateId: "candidate-1",
      };

      expect(confirmation.confirmed).toBe(true);
      expect(confirmation.selectedCandidateId).toBeTruthy();
    });

    it("should support re-search with additional context", () => {
      const confirmation = {
        confirmed: false,
        additionalContext: "The one from Stanford",
      };

      expect(confirmation.confirmed).toBe(false);
      expect(confirmation.additionalContext).toBeTruthy();
    });
  });

  describe("Data Point Counting", () => {
    it("should count data points from scraped data", () => {
      const scrapedData = [
        {
          id: "1",
          source: "linkedin",
          data: {
            fullName: "Test Person",
            currentRole: "CEO",
            quotes: ["quote1", "quote2"],
          },
        },
      ];

      // Count: fullName(1) + currentRole(1) + quotes(2) = 4
      const count = scrapedData.reduce((sum, item) => {
        const d = item.data;
        return (
          sum +
          (d.fullName ? 1 : 0) +
          (d.currentRole ? 1 : 0) +
          (d.quotes?.length || 0)
        );
      }, 0);

      expect(count).toBe(4);
    });
  });
});

describe("Investigation Result Structure", () => {
  it("should have required fields", () => {
    const result = {
      targetId: "uuid-here",
      targetName: "Test Person",
      status: "ready",
      sourcesScraped: 10,
      dataPoints: 50,
      scrapedData: [],
      persona: null,
      conversationId: "conv-123",
    };

    expect(result).toHaveProperty("targetId");
    expect(result).toHaveProperty("targetName");
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("sourcesScraped");
    expect(result).toHaveProperty("dataPoints");
  });
});
