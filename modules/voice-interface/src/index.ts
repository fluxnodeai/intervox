/**
 * Voice Interface Module
 *
 * Handles voice conversations using:
 * - Grok (xAI) for persona responses (better personality)
 * - ElevenLabs for text-to-speech
 */

import { config } from "@/shared/config";
import { ElevenLabsClient } from "elevenlabs";
import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";
import {
  PersonaModel,
  ConversationSession,
  ConversationMessage,
  VoiceConfig,
} from "@/shared/types";

// Initialize Grok client (uses OpenAI-compatible API)
const grok = new OpenAI({
  apiKey: config.xai.apiKey,
  baseURL: config.xai.baseUrl,
});

// Initialize ElevenLabs client
const elevenlabs = new ElevenLabsClient({
  apiKey: config.elevenlabs.apiKey,
});

// In-memory conversation store
const conversations = new Map<string, ConversationSession>();
const personaPrompts = new Map<string, string>();

// ============================================
// Voice Configuration
// ============================================

// Default voice settings
const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel - natural conversational voice
  stability: 0.5,
  similarityBoost: 0.75,
  style: 0.5,
};

// Voice options for different persona types
export const VOICE_OPTIONS = {
  male_professional: "ErXwobaYiN019PkySvjV", // Antoni
  male_casual: "VR6AewLTigWG4xSOukaG", // Arnold
  female_professional: "21m00Tcm4TlvDq8ikWAM", // Rachel
  female_casual: "EXAVITQu4vr4xnSDxMaL", // Bella
  neutral: "AZnzlk1XvdvUeBnXmlld", // Domi
};

// ============================================
// Conversation Management
// ============================================

/**
 * Start a new conversation session with a persona
 */
export async function startConversation(
  persona: PersonaModel,
  voiceConfig?: Partial<VoiceConfig>
): Promise<ConversationSession> {
  const sessionId = uuidv4();

  const session: ConversationSession = {
    id: sessionId,
    personaId: persona.targetId,
    personaName: persona.identity.fullName,
    startedAt: new Date().toISOString(),
    messages: [],
    status: "active",
  };

  // Store the system prompt for this conversation
  personaPrompts.set(sessionId, persona.systemPrompt);

  // Store the session
  conversations.set(sessionId, session);

  return session;
}

/**
 * Send a message and get a response from the persona
 */
export async function chat(
  sessionId: string,
  userMessage: string
): Promise<ConversationMessage> {
  const session = conversations.get(sessionId);
  const systemPrompt = personaPrompts.get(sessionId);

  if (!session || !systemPrompt) {
    throw new Error(`Conversation ${sessionId} not found`);
  }

  // Add user message to history
  const userMsg: ConversationMessage = {
    id: uuidv4(),
    role: "user",
    content: userMessage,
    timestamp: new Date().toISOString(),
  };
  session.messages.push(userMsg);

  // Build messages for Grok
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...session.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  // Get response from Grok
  const response = await grok.chat.completions.create({
    model: "grok-2-latest",
    messages,
    max_tokens: 300, // Keep responses concise for voice
    temperature: 0.8, // Slightly creative for personality
  });

  const assistantContent =
    response.choices[0]?.message?.content || "I'm not sure how to respond to that.";

  // Add assistant message to history
  const assistantMsg: ConversationMessage = {
    id: uuidv4(),
    role: "assistant",
    content: assistantContent,
    timestamp: new Date().toISOString(),
  };
  session.messages.push(assistantMsg);

  // Update session
  conversations.set(sessionId, session);

  return assistantMsg;
}

/**
 * Convert text to speech using ElevenLabs
 */
export async function textToSpeech(
  text: string,
  voiceConfig?: Partial<VoiceConfig>
): Promise<Buffer> {
  const config = { ...DEFAULT_VOICE_CONFIG, ...voiceConfig };

  const audioStream = await elevenlabs.textToSpeech.convert(config.voiceId, {
    text,
    model_id: "eleven_turbo_v2_5",
    voice_settings: {
      stability: config.stability,
      similarity_boost: config.similarityBoost,
      style: config.style,
    },
  });

  // Convert stream to buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of audioStream) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

/**
 * Send a message and get audio response
 */
export async function chatWithVoice(
  sessionId: string,
  userMessage: string,
  voiceConfig?: Partial<VoiceConfig>
): Promise<{ message: ConversationMessage; audio: Buffer }> {
  // Get text response
  const message = await chat(sessionId, userMessage);

  // Convert to speech
  const audio = await textToSpeech(message.content, voiceConfig);

  return { message, audio };
}

/**
 * Get conversation history
 */
export function getConversation(sessionId: string): ConversationSession | null {
  return conversations.get(sessionId) || null;
}

/**
 * End a conversation
 */
export function endConversation(sessionId: string): void {
  const session = conversations.get(sessionId);
  if (session) {
    session.status = "ended";
    conversations.set(sessionId, session);
  }
}

/**
 * Stream response for real-time conversations
 */
export async function* streamChat(
  sessionId: string,
  userMessage: string
): AsyncGenerator<string> {
  const session = conversations.get(sessionId);
  const systemPrompt = personaPrompts.get(sessionId);

  if (!session || !systemPrompt) {
    throw new Error(`Conversation ${sessionId} not found`);
  }

  // Add user message
  const userMsg: ConversationMessage = {
    id: uuidv4(),
    role: "user",
    content: userMessage,
    timestamp: new Date().toISOString(),
  };
  session.messages.push(userMsg);

  // Build messages
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...session.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  // Stream response from Grok
  const stream = await grok.chat.completions.create({
    model: "grok-2-latest",
    messages,
    max_tokens: 300,
    temperature: 0.8,
    stream: true,
  });

  let fullContent = "";

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    if (content) {
      fullContent += content;
      yield content;
    }
  }

  // Add complete assistant message to history
  const assistantMsg: ConversationMessage = {
    id: uuidv4(),
    role: "assistant",
    content: fullContent,
    timestamp: new Date().toISOString(),
  };
  session.messages.push(assistantMsg);
  conversations.set(sessionId, session);
}
