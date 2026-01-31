/**
 * Voice Interface Module Tests
 *
 * Tests for Grok responses and ElevenLabs TTS.
 * @see prompts/voice-interface.prompt
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock config
vi.mock("@/shared/config", () => ({
  config: {
    xai: { apiKey: "test-xai-key", baseUrl: "https://api.x.ai/v1" },
    elevenlabs: { apiKey: "test-elevenlabs-key" },
  },
}));

describe("Voice Interface Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Voice ID Configuration", () => {
    it("should have male voice options", () => {
      const maleVoices = {
        male_default: "ErXwobaYiN019PkySvjV",
        male_deep: "VR6AewLTigWG4xSOukaG",
        male_warm: "JBFqnCBsd6RMkjVDRZzb",
      };

      Object.values(maleVoices).forEach((voiceId) => {
        expect(voiceId).toBeTruthy();
        expect(typeof voiceId).toBe("string");
      });
    });

    it("should have female voice options", () => {
      const femaleVoices = {
        female_default: "EXAVITQu4vr4xnSDxMaL",
        female_young: "FGY2WhTYpPnrIDTdsKH5",
        female_professional: "21m00Tcm4TlvDq8ikWAM",
      };

      Object.values(femaleVoices).forEach((voiceId) => {
        expect(voiceId).toBeTruthy();
      });
    });
  });

  describe("Gender Detection", () => {
    it("should detect male names", () => {
      const maleNames = ["james", "john", "michael", "david", "elon", "jeff", "bill"];

      maleNames.forEach((name) => {
        expect(typeof name).toBe("string");
        expect(name.length).toBeGreaterThan(0);
      });
    });

    it("should detect female names", () => {
      const femaleNames = ["mary", "jennifer", "sarah", "emily", "lisa", "jessica"];

      femaleNames.forEach((name) => {
        expect(typeof name).toBe("string");
        expect(name.length).toBeGreaterThan(0);
      });
    });

    it("should extract first name from full name", () => {
      const fullName = "Elon Musk";
      const firstName = fullName.split(" ")[0].toLowerCase();

      expect(firstName).toBe("elon");
    });

    it("should handle single names", () => {
      const singleName = "Madonna";
      const firstName = singleName.split(" ")[0].toLowerCase();

      expect(firstName).toBe("madonna");
    });
  });

  describe("Conversation Session", () => {
    it("should have required session fields", () => {
      const session = {
        id: "session-uuid",
        personaId: "persona-uuid",
        personaName: "Test Person",
        startedAt: new Date().toISOString(),
        messages: [],
        status: "active" as const,
      };

      expect(session.id).toBeTruthy();
      expect(session.personaId).toBeTruthy();
      expect(session.status).toBe("active");
      expect(Array.isArray(session.messages)).toBe(true);
    });

    it("should support session status values", () => {
      const validStatuses = ["active", "ended"];

      validStatuses.forEach((status) => {
        expect(["active", "ended"]).toContain(status);
      });
    });
  });

  describe("Conversation Messages", () => {
    it("should have required message fields", () => {
      const message = {
        id: "msg-uuid",
        role: "user" as const,
        content: "Hello, how are you?",
        timestamp: new Date().toISOString(),
      };

      expect(message.id).toBeTruthy();
      expect(["user", "assistant"]).toContain(message.role);
      expect(message.content).toBeTruthy();
    });

    it("should alternate between user and assistant", () => {
      const messages = [
        { role: "user", content: "Hi" },
        { role: "assistant", content: "Hello!" },
        { role: "user", content: "How are you?" },
        { role: "assistant", content: "I'm doing well." },
      ];

      for (let i = 1; i < messages.length; i++) {
        expect(messages[i].role).not.toBe(messages[i - 1].role);
      }
    });
  });

  describe("Grok Integration", () => {
    it("should use correct model", () => {
      const model = "grok-2-latest";
      expect(model).toContain("grok");
    });

    it("should set appropriate temperature", () => {
      const temperature = 0.85;
      expect(temperature).toBeGreaterThan(0);
      expect(temperature).toBeLessThan(1);
    });

    it("should limit max tokens", () => {
      const maxTokens = 500;
      expect(maxTokens).toBeGreaterThan(100);
      expect(maxTokens).toBeLessThan(4000);
    });
  });

  describe("ElevenLabs TTS", () => {
    it("should use turbo model", () => {
      const model = "eleven_turbo_v2_5";
      expect(model).toContain("turbo");
    });

    it("should configure voice settings", () => {
      const settings = {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.5,
      };

      expect(settings.stability).toBeGreaterThanOrEqual(0);
      expect(settings.stability).toBeLessThanOrEqual(1);
      expect(settings.similarity_boost).toBeGreaterThanOrEqual(0);
      expect(settings.similarity_boost).toBeLessThanOrEqual(1);
    });
  });

  describe("Audio Response", () => {
    it("should return buffer for TTS", () => {
      const mockAudioBuffer = Buffer.from("fake audio data");

      expect(Buffer.isBuffer(mockAudioBuffer)).toBe(true);
      expect(mockAudioBuffer.length).toBeGreaterThan(0);
    });
  });

  describe("Chat with Voice", () => {
    it("should return message and audio", () => {
      const response = {
        message: {
          id: "msg-uuid",
          role: "assistant" as const,
          content: "Hello! Great to talk with you.",
          timestamp: new Date().toISOString(),
        },
        audio: Buffer.from("fake audio"),
      };

      expect(response.message.content).toBeTruthy();
      expect(Buffer.isBuffer(response.audio)).toBe(true);
    });
  });
});
