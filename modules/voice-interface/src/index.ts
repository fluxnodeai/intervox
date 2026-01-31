/**
 * Voice Interface Module
 *
 * Handles voice conversations using:
 * - Grok (xAI) for persona responses (better personality)
 * - ElevenLabs for text-to-speech with auto-detected voice
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
const personaVoices = new Map<string, string>();

// ============================================
// Voice Configuration
// ============================================

// ElevenLabs voice IDs
const VOICE_IDS = {
  // Male voices
  male_default: 'ErXwobaYiN019PkySvjV', // Antoni - professional male
  male_deep: 'VR6AewLTigWG4xSOukaG', // Arnold - deeper male
  male_warm: 'JBFqnCBsd6RMkjVDRZzb', // George - warm storyteller

  // Female voices
  female_default: 'EXAVITQu4vr4xnSDxMaL', // Sarah - mature female
  female_young: 'FGY2WhTYpPnrIDTdsKH5', // Laura - enthusiastic
  female_professional: '21m00Tcm4TlvDq8ikWAM', // Rachel - professional

  // Neutral/other
  neutral: 'IKne3meq5aSn9XLyUdCD', // Charlie - energetic neutral
};

// Common male and female first names for gender detection
const MALE_NAMES = new Set([
  'james', 'john', 'robert', 'michael', 'david', 'william', 'richard', 'joseph',
  'thomas', 'charles', 'christopher', 'daniel', 'matthew', 'anthony', 'mark',
  'donald', 'steven', 'paul', 'andrew', 'joshua', 'kenneth', 'kevin', 'brian',
  'george', 'timothy', 'ronald', 'edward', 'jason', 'jeffrey', 'ryan', 'jacob',
  'gary', 'nicholas', 'eric', 'jonathan', 'stephen', 'larry', 'justin', 'scott',
  'brandon', 'benjamin', 'samuel', 'raymond', 'gregory', 'frank', 'alexander',
  'patrick', 'jack', 'dennis', 'jerry', 'tyler', 'aaron', 'jose', 'adam', 'nathan',
  'henry', 'douglas', 'zachary', 'peter', 'kyle', 'noah', 'ethan', 'jeremy',
  'walter', 'christian', 'keith', 'roger', 'terry', 'austin', 'sean', 'gerald',
  'carl', 'harold', 'dylan', 'arthur', 'lawrence', 'jordan', 'jesse', 'bryan',
  'billy', 'bruce', 'gabriel', 'joe', 'logan', 'albert', 'willie', 'alan', 'eugene',
  'russell', 'vincent', 'philip', 'bobby', 'johnny', 'bradley', 'elon', 'jeff',
  'bill', 'steve', 'tim', 'sam', 'ben', 'tom', 'mike', 'bob', 'dan', 'chris',
]);

const FEMALE_NAMES = new Set([
  'mary', 'patricia', 'jennifer', 'linda', 'barbara', 'elizabeth', 'susan',
  'jessica', 'sarah', 'karen', 'lisa', 'nancy', 'betty', 'margaret', 'sandra',
  'ashley', 'kimberly', 'emily', 'donna', 'michelle', 'dorothy', 'carol',
  'amanda', 'melissa', 'deborah', 'stephanie', 'rebecca', 'sharon', 'laura',
  'cynthia', 'kathleen', 'amy', 'angela', 'shirley', 'anna', 'brenda', 'pamela',
  'emma', 'nicole', 'helen', 'samantha', 'katherine', 'christine', 'debra',
  'rachel', 'carolyn', 'janet', 'catherine', 'maria', 'heather', 'diane',
  'ruth', 'julie', 'olivia', 'joyce', 'virginia', 'victoria', 'kelly', 'lauren',
  'christina', 'joan', 'evelyn', 'judith', 'megan', 'andrea', 'cheryl', 'hannah',
  'jacqueline', 'martha', 'gloria', 'teresa', 'ann', 'sara', 'madison', 'frances',
  'kathryn', 'janice', 'jean', 'abigail', 'alice', 'judy', 'sophia', 'grace',
  'denise', 'amber', 'doris', 'marilyn', 'danielle', 'beverly', 'isabella',
  'theresa', 'diana', 'natalie', 'brittany', 'charlotte', 'marie', 'kayla', 'alexis',
]);

/**
 * Detect gender from name and return appropriate voice ID
 */
async function selectVoiceForPersona(persona: PersonaModel): Promise<string> {
  const firstName = persona.identity.fullName.split(' ')[0].toLowerCase();

  // First, check if ElevenLabs has a voice matching this person's name
  try {
    const voices = await elevenlabs.voices.getAll();
    const matchingVoice = voices.voices.find(v =>
      v.name?.toLowerCase().includes(firstName) ||
      v.name?.toLowerCase().includes(persona.identity.fullName.toLowerCase())
    );

    if (matchingVoice) {
      console.log(`Found matching ElevenLabs voice: ${matchingVoice.name}`);
      return matchingVoice.voice_id;
    }
  } catch (e) {
    console.error('Error checking ElevenLabs voices:', e);
  }

  // Fall back to gender detection
  if (MALE_NAMES.has(firstName)) {
    console.log(`Detected male name: ${firstName}, using male voice`);
    return VOICE_IDS.male_default;
  }

  if (FEMALE_NAMES.has(firstName)) {
    console.log(`Detected female name: ${firstName}, using female voice`);
    return VOICE_IDS.female_default;
  }

  // Check persona bio for gender hints
  const bio = (persona.identity.bio || '').toLowerCase();
  if (bio.includes(' he ') || bio.includes(' his ') || bio.includes('businessman') || bio.includes('father')) {
    return VOICE_IDS.male_default;
  }
  if (bio.includes(' she ') || bio.includes(' her ') || bio.includes('businesswoman') || bio.includes('mother')) {
    return VOICE_IDS.female_default;
  }

  // Default to male (as specified in requirements)
  console.log(`Could not detect gender for ${firstName}, defaulting to male voice`);
  return VOICE_IDS.male_default;
}

// ============================================
// Conversation Management
// ============================================

/**
 * Start a new conversation session with a persona
 * Auto-selects appropriate voice based on persona
 */
export async function startConversation(
  persona: PersonaModel
): Promise<ConversationSession> {
  const sessionId = uuidv4();

  // Select voice for this persona
  const voiceId = await selectVoiceForPersona(persona);
  personaVoices.set(sessionId, voiceId);

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

  console.log(`Started conversation ${sessionId} for ${persona.identity.fullName} with voice ${voiceId}`);

  return session;
}

/**
 * Send a message and get a response from the persona via Grok
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
    max_tokens: 500, // Slightly longer for richer responses
    temperature: 0.85, // Good personality expression
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
 * Uses the voice selected for this conversation
 */
export async function textToSpeech(
  text: string,
  sessionId?: string
): Promise<Buffer> {
  // Get voice ID for this session, or use default
  const voiceId = sessionId
    ? personaVoices.get(sessionId) || VOICE_IDS.male_default
    : VOICE_IDS.male_default;

  const audioStream = await elevenlabs.textToSpeech.convert(voiceId, {
    text,
    model_id: "eleven_turbo_v2_5",
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.5,
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
 * This is the main function for voice conversations
 */
export async function chatWithVoice(
  sessionId: string,
  userMessage: string
): Promise<{ message: ConversationMessage; audio: Buffer }> {
  // Get text response from Grok
  const message = await chat(sessionId, userMessage);

  // Convert to speech using the persona's voice
  const audio = await textToSpeech(message.content, sessionId);

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
  // Clean up
  personaPrompts.delete(sessionId);
  personaVoices.delete(sessionId);
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
    max_tokens: 500,
    temperature: 0.85,
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

/**
 * Get available voice options
 */
export function getVoiceOptions() {
  return VOICE_IDS;
}
