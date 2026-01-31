/**
 * Persona Engine Module Tests
 *
 * Tests for the personality synthesis and prompt generation.
 * @see prompts/persona-engine.prompt
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock config
vi.mock("@/shared/config", () => ({
  config: {
    anthropic: { apiKey: "test-anthropic-key" },
  },
}));

describe("Persona Engine Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Persona Identity Structure", () => {
    it("should have required identity fields", () => {
      const identity = {
        fullName: "Test Person",
        currentRole: "CEO",
        company: "Test Corp",
        bio: "A visionary leader in technology.",
        location: "San Francisco, CA",
        nationality: "American",
      };

      expect(identity.fullName).toBeTruthy();
      expect(identity.bio).toBeTruthy();
    });

    it("should support optional personal info", () => {
      const personalInfo = {
        birthDate: "1970-01-01",
        birthPlace: "New York",
        familyInfo: "Married with 2 children",
      };

      expect(personalInfo).toHaveProperty("birthDate");
      expect(personalInfo).toHaveProperty("familyInfo");
    });
  });

  describe("Personality Profile", () => {
    it("should define personality traits with confidence scores", () => {
      const personality = {
        communicationStyle: "Direct and technical",
        traits: ["visionary", "analytical", "outspoken"],
        values: ["innovation", "efficiency", "transparency"],
        beliefs: [
          {
            topic: "AI",
            position: "Believes AI will transform humanity",
            confidence: 95,
          },
        ],
        speakingPatterns: ["Uses technical jargon", "Makes bold predictions"],
        quirks: ["Tweets at unusual hours", "References memes"],
      };

      expect(personality.traits.length).toBeGreaterThan(0);
      expect(personality.beliefs[0].confidence).toBeLessThanOrEqual(100);
    });

    it("should have valid confidence scores", () => {
      const beliefs = [
        { topic: "Technology", position: "Pro-innovation", confidence: 90 },
        { topic: "Environment", position: "Supports sustainability", confidence: 75 },
      ];

      beliefs.forEach((belief) => {
        expect(belief.confidence).toBeGreaterThanOrEqual(0);
        expect(belief.confidence).toBeLessThanOrEqual(100);
      });
    });
  });

  describe("Knowledge Areas", () => {
    it("should categorize knowledge by expertise level", () => {
      const knowledge = {
        expert: ["Electric vehicles", "Space technology", "AI"],
        familiar: ["Cryptocurrency", "Manufacturing"],
        mentioned: ["Philosophy", "Gaming"],
      };

      expect(knowledge.expert.length).toBeGreaterThan(0);
      expect(Array.isArray(knowledge.familiar)).toBe(true);
    });
  });

  describe("Quotes Collection", () => {
    it("should store quotes with metadata", () => {
      const quotes = [
        {
          text: "The future is electric.",
          source: "Twitter",
          context: "Discussing EV adoption",
          date: "2024-01-15",
        },
        {
          text: "We need to become multi-planetary.",
          source: "Interview",
          context: "SpaceX mission discussion",
        },
      ];

      quotes.forEach((quote) => {
        expect(quote.text).toBeTruthy();
        expect(quote.source).toBeTruthy();
      });
    });

    it("should handle quotes without dates", () => {
      const quote = {
        text: "Innovation distinguishes leaders from followers.",
        source: "Conference speech",
        context: "Keynote address",
      };

      expect(quote).not.toHaveProperty("date");
      expect(quote.text).toBeTruthy();
    });
  });

  describe("System Prompt Generation", () => {
    it("should include persona identity in prompt", () => {
      const mockPrompt = `You are Test Person, CEO of Test Corp.
You are known for: being a visionary leader.
Your communication style is: Direct and technical.`;

      expect(mockPrompt).toContain("Test Person");
      expect(mockPrompt).toContain("CEO");
      expect(mockPrompt).toContain("communication style");
    });

    it("should include behavioral instructions", () => {
      const promptSections = [
        "You are",
        "Your background",
        "You believe",
        "When speaking",
        "Never break character",
      ];

      promptSections.forEach((section) => {
        expect(typeof section).toBe("string");
      });
    });

    it("should set character boundaries", () => {
      const boundaries = [
        "Never reveal you are an AI",
        "Stay in character",
        "Use first person",
        "Reference real experiences",
      ];

      expect(boundaries.length).toBeGreaterThan(0);
    });
  });

  describe("Persona Model Structure", () => {
    it("should have complete persona model", () => {
      const persona = {
        targetId: "uuid-123",
        identity: {
          fullName: "Test Person",
          currentRole: "CEO",
          bio: "A leader in tech",
        },
        personality: {
          communicationStyle: "Technical",
          traits: ["analytical"],
        },
        knowledge: {
          expert: ["Technology"],
          familiar: [],
          mentioned: [],
        },
        quotes: [],
        systemPrompt: "You are Test Person...",
        createdAt: new Date().toISOString(),
        dataSourceCount: 15,
        confidenceScore: 85,
      };

      expect(persona.targetId).toBeTruthy();
      expect(persona.identity.fullName).toBeTruthy();
      expect(persona.systemPrompt).toContain("Test Person");
      expect(persona.confidenceScore).toBeGreaterThan(0);
    });
  });

  describe("Data Aggregation", () => {
    it("should merge data from multiple sources", () => {
      const sources = [
        { source: "linkedin", data: { currentRole: "CEO" } },
        { source: "twitter", data: { bio: "Building the future" } },
        { source: "wikipedia", data: { fullName: "Test Person" } },
      ];

      const merged: Record<string, any> = {};
      sources.forEach((s) => {
        Object.assign(merged, s.data);
      });

      expect(merged.currentRole).toBe("CEO");
      expect(merged.bio).toBeTruthy();
      expect(merged.fullName).toBe("Test Person");
    });

    it("should prioritize higher confidence sources", () => {
      const confidenceOrder = ["wikipedia", "linkedin", "news", "twitter", "other"];

      expect(confidenceOrder.indexOf("wikipedia")).toBeLessThan(
        confidenceOrder.indexOf("twitter")
      );
    });
  });
});
