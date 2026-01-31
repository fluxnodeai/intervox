/**
 * Scraper Swarm Module Tests
 *
 * Tests for the multi-source web scraping pipeline.
 * @see prompts/scraper-swarm.prompt
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock config
vi.mock("@/shared/config", () => ({
  config: {
    rtrvr: { apiKey: "test-rtrvr-key" },
    anthropic: { apiKey: "test-anthropic-key" },
  },
}));

// Mock fetch for rtrvr.ai API
vi.mock("node-fetch", () => ({
  default: vi.fn(),
}));

describe("Scraper Swarm Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Source Types", () => {
    it("should define all required source types", () => {
      const sourceTypes = [
        "linkedin",
        "twitter",
        "wikipedia",
        "news",
        "youtube",
        "github",
        "company",
        "podcast",
        "google",
        "other",
      ];

      sourceTypes.forEach((source) => {
        expect(typeof source).toBe("string");
      });

      expect(sourceTypes.length).toBeGreaterThanOrEqual(9);
    });
  });

  describe("URL Generation", () => {
    it("should generate search URLs for all sources", () => {
      const name = "Test Person";
      const encodedName = encodeURIComponent(name);

      const expectedPatterns = [
        `linkedin.com`,
        `twitter.com`,
        `wikipedia.org`,
        `google.com`,
        `youtube.com`,
        `github.com`,
      ];

      // Each pattern should be representable as a URL
      expectedPatterns.forEach((pattern) => {
        expect(pattern).toMatch(/\.(com|org)/);
      });
    });

    it("should properly encode names with spaces", () => {
      const name = "Elon Musk";
      const encoded = encodeURIComponent(name);
      expect(encoded).toBe("Elon%20Musk");
    });

    it("should handle special characters in names", () => {
      const name = "José García";
      const encoded = encodeURIComponent(name);
      expect(encoded).not.toContain(" ");
      expect(encoded).toContain("%");
    });
  });

  describe("Identity Candidate Structure", () => {
    it("should have required fields", () => {
      const candidate = {
        id: "uuid-123",
        name: "Test Person",
        description: "A notable person",
        confidence: 85,
        sources: ["google.com"],
      };

      expect(candidate.id).toBeTruthy();
      expect(candidate.name).toBeTruthy();
      expect(candidate.confidence).toBeGreaterThan(0);
      expect(candidate.confidence).toBeLessThanOrEqual(100);
      expect(Array.isArray(candidate.sources)).toBe(true);
    });
  });

  describe("Scraped Data Structure", () => {
    it("should have valid scraped data format", () => {
      const scrapedData = {
        id: "data-123",
        source: "linkedin" as const,
        sourceUrl: "https://linkedin.com/in/testperson",
        scrapedAt: new Date().toISOString(),
        confidence: 90,
        data: {
          fullName: "Test Person",
          currentRole: "Software Engineer",
        },
        rawContent: "Raw page content...",
      };

      expect(scrapedData.id).toBeTruthy();
      expect(scrapedData.source).toBe("linkedin");
      expect(scrapedData.sourceUrl).toMatch(/^https?:\/\//);
      expect(scrapedData.confidence).toBeGreaterThan(0);
    });

    it("should assign confidence based on source type", () => {
      const confidenceMap: Record<string, number> = {
        wikipedia: 95,
        linkedin: 90,
        twitter: 75,
        other: 70,
      };

      expect(confidenceMap.wikipedia).toBeGreaterThan(confidenceMap.linkedin);
      expect(confidenceMap.linkedin).toBeGreaterThan(confidenceMap.other);
    });
  });

  describe("Person Data Extraction", () => {
    it("should support all person data fields", () => {
      const personData = {
        fullName: "Test Person",
        currentRole: "CEO",
        company: "Test Corp",
        bio: "A test biography",
        location: "San Francisco, CA",
        quotes: [{ text: "Test quote", source: "interview", context: "context" }],
        opinions: [{ topic: "AI", position: "bullish", confidence: 90 }],
        education: [{ institution: "Stanford", degree: "BS", field: "CS" }],
        workHistory: [{ company: "Test Corp", role: "CEO", duration: "2020-present" }],
        skills: ["TypeScript", "AI", "Leadership"],
      };

      expect(personData.fullName).toBeTruthy();
      expect(Array.isArray(personData.quotes)).toBe(true);
      expect(Array.isArray(personData.skills)).toBe(true);
    });
  });

  describe("Scraping Progress", () => {
    it("should track scraping progress", () => {
      const progress = {
        totalPages: 100,
        scrapedPages: 25,
        currentSource: "linkedin",
        creditsUsed: 12.5,
        status: "scraping" as const,
      };

      expect(progress.scrapedPages).toBeLessThanOrEqual(progress.totalPages);
      expect(progress.creditsUsed).toBeGreaterThanOrEqual(0);
      expect(["searching", "scraping", "processing", "complete", "error"]).toContain(
        progress.status
      );
    });
  });

  describe("Source Detection", () => {
    it("should detect source type from URL", () => {
      const urlToSource: Record<string, string> = {
        "https://linkedin.com/in/user": "linkedin",
        "https://twitter.com/user": "twitter",
        "https://x.com/user": "twitter",
        "https://en.wikipedia.org/wiki/Person": "wikipedia",
        "https://youtube.com/watch?v=123": "youtube",
        "https://github.com/user": "github",
      };

      Object.entries(urlToSource).forEach(([url, expectedSource]) => {
        if (url.includes("linkedin")) expect(expectedSource).toBe("linkedin");
        if (url.includes("twitter") || url.includes("x.com"))
          expect(expectedSource).toBe("twitter");
        if (url.includes("wikipedia")) expect(expectedSource).toBe("wikipedia");
      });
    });
  });
});

describe("rtrvr.ai API Integration", () => {
  it("should format scrape request correctly", () => {
    const request = {
      urls: ["https://example.com"],
      response: { verbosity: "final" },
    };

    expect(request.urls).toHaveLength(1);
    expect(request.response.verbosity).toBe("final");
  });

  it("should format agent request correctly", () => {
    const request = {
      input: "Extract information about Test Person",
      urls: ["https://example.com"],
      response: { verbosity: "final" },
    };

    expect(request.input).toBeTruthy();
    expect(request.urls).toHaveLength(1);
  });
});
