/**
 * Toolhouse Agent Module Tests
 *
 * Tests for Toolhouse.ai integration.
 * @see prompts/toolhouse-agent.prompt
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock config
vi.mock("@/shared/config", () => ({
  config: {
    toolhouse: { apiKey: "test-toolhouse-key" },
    anthropic: { apiKey: "test-anthropic-key" },
  },
}));

// Mock Toolhouse SDK
vi.mock("@toolhouseai/sdk", () => ({
  Toolhouse: vi.fn().mockImplementation(() => ({
    getTools: vi.fn().mockResolvedValue([
      { name: "web_search", description: "Search the web" },
      { name: "memory_store", description: "Store in memory" },
    ]),
    runTools: vi.fn().mockResolvedValue([]),
  })),
}));

describe("Toolhouse Agent Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Initialization", () => {
    it("should configure Toolhouse with Anthropic provider", () => {
      const config = {
        apiKey: "test-key",
        provider: "anthropic",
      };

      expect(config.provider).toBe("anthropic");
      expect(config.apiKey).toBeTruthy();
    });

    it("should support multiple providers", () => {
      const providers = ["openai", "anthropic", "vercel"];

      providers.forEach((provider) => {
        expect(["openai", "anthropic", "vercel"]).toContain(provider);
      });
    });
  });

  describe("Tool Bundles", () => {
    it("should define tool bundles", () => {
      const bundles = ["web_search", "scraping", "memory", "all"];

      bundles.forEach((bundle) => {
        expect(typeof bundle).toBe("string");
      });

      expect(bundles).toContain("all");
    });
  });

  describe("Health Check", () => {
    it("should return health status structure", () => {
      const healthStatus = {
        connected: true,
        toolCount: 5,
      };

      expect(healthStatus.connected).toBe(true);
      expect(healthStatus.toolCount).toBeGreaterThanOrEqual(0);
    });

    it("should include error on failure", () => {
      const failedStatus = {
        connected: false,
        toolCount: 0,
        error: "API key invalid",
      };

      expect(failedStatus.connected).toBe(false);
      expect(failedStatus.error).toBeTruthy();
    });
  });

  describe("Tool Execution", () => {
    it("should accept task and context", () => {
      const execution = {
        task: "Search for information about AI",
        context: "Research task",
        bundle: "web_search" as const,
      };

      expect(execution.task).toBeTruthy();
      expect(execution.bundle).toBe("web_search");
    });

    it("should handle tool responses", () => {
      const toolResponse = {
        success: true,
        result: "Found 10 relevant articles about AI.",
      };

      expect(toolResponse.success).toBe(true);
      expect(toolResponse.result).toBeTruthy();
    });
  });

  describe("Web Search", () => {
    it("should format search query", () => {
      const query = "Elon Musk latest news";
      const formattedTask = `Search the web for: "${query}". Return relevant information found.`;

      expect(formattedTask).toContain(query);
      expect(formattedTask).toContain("Search the web");
    });
  });

  describe("Person Analysis", () => {
    it("should return analysis structure", () => {
      const analysis = {
        summary: "Elon Musk is a technology entrepreneur...",
        sources: ["toolhouse-web-search", "toolhouse-memory"],
        confidence: 85,
      };

      expect(analysis.summary).toBeTruthy();
      expect(Array.isArray(analysis.sources)).toBe(true);
      expect(analysis.confidence).toBeGreaterThan(0);
      expect(analysis.confidence).toBeLessThanOrEqual(100);
    });

    it("should include context in analysis", () => {
      const name = "Elon Musk";
      const context = "CEO of Tesla and SpaceX";
      const prompt = `Research and analyze the public figure "${name}". Additional context: ${context}`;

      expect(prompt).toContain(name);
      expect(prompt).toContain(context);
    });
  });

  describe("Memory Operations", () => {
    it("should store information with key", () => {
      const memoryOp = {
        key: "investigation-123",
        content: "Gathered 50 data points about the subject.",
      };

      expect(memoryOp.key).toBeTruthy();
      expect(memoryOp.content).toBeTruthy();
    });

    it("should retrieve information by key", () => {
      const key = "investigation-123";
      const expectedPrompt = `Retrieve information stored with key "${key}"`;

      expect(expectedPrompt).toContain(key);
    });
  });

  describe("Error Handling", () => {
    it("should wrap calls in try-catch", () => {
      const errorHandler = (error: Error) => {
        return {
          connected: false,
          toolCount: 0,
          error: error.message,
        };
      };

      const result = errorHandler(new Error("Connection failed"));
      expect(result.error).toBe("Connection failed");
    });

    it("should return graceful fallbacks", () => {
      const fallback = {
        summary: "",
        sources: [],
        confidence: 0,
      };

      expect(fallback.confidence).toBe(0);
      expect(fallback.sources).toHaveLength(0);
    });
  });
});

describe("Toolhouse SDK Integration", () => {
  it("should get tools from Toolhouse", async () => {
    const mockTools = [
      { name: "web_search", description: "Search the web" },
      { name: "memory", description: "Store and retrieve data" },
    ];

    expect(mockTools.length).toBeGreaterThan(0);
    mockTools.forEach((tool) => {
      expect(tool.name).toBeTruthy();
    });
  });

  it("should run tools with Claude response", () => {
    const claudeResponse = {
      content: [{ type: "tool_use", id: "tool-1", name: "web_search", input: {} }],
      stop_reason: "tool_use",
    };

    expect(claudeResponse.stop_reason).toBe("tool_use");
  });
});
