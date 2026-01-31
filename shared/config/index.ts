/**
 * INTERVOX Configuration
 *
 * SECURITY: All API keys are loaded from environment variables.
 * NEVER hardcode secrets. NEVER commit .env files.
 *
 * Usage:
 *   import { config } from '@/shared/config';
 *   const client = new Client({ apiKey: config.anthropic.apiKey });
 */

import "dotenv/config";

/**
 * Safely get an environment variable
 * Throws if required variable is missing
 */
function getEnvVar(name: string, required: boolean = true): string {
  const value = process.env[name];

  if (required && !value) {
    throw new Error(
      `Missing required environment variable: ${name}\n` +
        `Please ensure ${name} is set in your .env file.\n` +
        `See .env.example for required variables.`
    );
  }

  return value || "";
}

/**
 * Application configuration
 * All secrets come from environment variables
 */
export const config = {
  // Anthropic - Claude API (orchestration, scraping logic, persona building)
  anthropic: {
    apiKey: getEnvVar("ANTHROPIC_API_KEY"),
  },

  // xAI - Grok API (voice persona responses - better personality)
  xai: {
    apiKey: getEnvVar("XAI_API_KEY"),
    baseUrl: "https://api.x.ai/v1",
  },

  // ElevenLabs - Voice AI (text-to-speech)
  elevenlabs: {
    apiKey: getEnvVar("ELEVENLABS_API_KEY"),
  },

  // Toolhouse.ai - Agent Orchestration
  toolhouse: {
    apiKey: getEnvVar("TOOLHOUSE_API_KEY"),
  },

  // rtrvr.ai - Web Scraping
  rtrvr: {
    apiKey: getEnvVar("RTRVR_API_KEY"),
    baseUrl: "https://api.rtrvr.ai",
  },

  // Server configuration
  server: {
    port: parseInt(getEnvVar("PORT", false) || "3000", 10),
    nodeEnv: getEnvVar("NODE_ENV", false) || "development",
  },

  // Feature flags
  isDevelopment: process.env.NODE_ENV !== "production",
  isProduction: process.env.NODE_ENV === "production",
};

/**
 * Validate that all required environment variables are set
 * Call this at application startup
 */
export function validateConfig(): void {
  const required = [
    "ANTHROPIC_API_KEY",
    "XAI_API_KEY",
    "ELEVENLABS_API_KEY",
    "TOOLHOUSE_API_KEY",
    "RTRVR_API_KEY",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.warn(
      `Missing environment variables:\n` +
        missing.map((k) => `  - ${k}`).join("\n") +
        `\n\nSome features may not work. Copy .env.example to .env and fill in your API keys.`
    );
  } else {
    console.log("Configuration validated successfully");
  }
}

export default config;
