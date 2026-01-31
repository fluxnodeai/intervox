/**
 * Persona Engine Module
 *
 * Builds personality and knowledge models from scraped data.
 * Generates system prompts for Grok to embody the persona.
 */

import { config } from "@/shared/config";
import Anthropic from "@anthropic-ai/sdk";
import {
  ScrapedData,
  PersonaModel,
  Quote,
  Opinion,
  Education,
  WorkExperience,
} from "@/shared/types";

// Use Anthropic for persona synthesis (it's better at analysis)
const anthropic = new Anthropic({
  apiKey: config.anthropic.apiKey,
});

// ============================================
// Persona Building
// ============================================

/**
 * Build a complete persona model from scraped data
 */
export async function buildPersona(
  targetId: string,
  targetName: string,
  scrapedData: ScrapedData[]
): Promise<PersonaModel> {
  // Aggregate all data
  const aggregatedData = aggregateScrapedData(scrapedData);

  // Use Claude to synthesize the persona
  const personaAnalysis = await analyzePersonality(targetName, aggregatedData);

  // Build the persona model
  const persona: PersonaModel = {
    targetId,
    targetName,
    identity: {
      fullName: aggregatedData.fullName || targetName,
      currentRole: aggregatedData.currentRole || "Unknown",
      company: aggregatedData.company,
      location: aggregatedData.location,
      bio: aggregatedData.bio || "",
      profileImageUrl: aggregatedData.profileImageUrl,
    },
    personality: personaAnalysis.personality,
    knowledge: {
      expertise: personaAnalysis.expertise,
      opinions: aggregatedData.opinions,
      experiences: personaAnalysis.experiences,
      education: aggregatedData.education,
      workHistory: aggregatedData.workHistory,
    },
    speech: {
      tone: personaAnalysis.tone,
      vocabulary: personaAnalysis.vocabulary,
      phrases: personaAnalysis.phrases,
      exampleQuotes: aggregatedData.quotes.slice(0, 10),
    },
    systemPrompt: "", // Will be generated
    createdAt: new Date().toISOString(),
    dataPointsUsed: countDataPoints(aggregatedData),
  };

  // Generate the system prompt for Grok
  persona.systemPrompt = generateSystemPrompt(persona);

  return persona;
}

/**
 * Aggregate data from multiple sources, deduplicating and merging
 */
function aggregateScrapedData(scrapedData: ScrapedData[]): {
  fullName?: string;
  currentRole?: string;
  company?: string;
  location?: string;
  bio?: string;
  profileImageUrl?: string;
  education: Education[];
  workHistory: WorkExperience[];
  quotes: Quote[];
  opinions: Opinion[];
  skills: string[];
  rawContent: string;
} {
  const result = {
    fullName: undefined as string | undefined,
    currentRole: undefined as string | undefined,
    company: undefined as string | undefined,
    location: undefined as string | undefined,
    bio: undefined as string | undefined,
    profileImageUrl: undefined as string | undefined,
    education: [] as Education[],
    workHistory: [] as WorkExperience[],
    quotes: [] as Quote[],
    opinions: [] as Opinion[],
    skills: [] as string[],
    rawContent: "",
  };

  // Sort by confidence (highest first)
  const sorted = [...scrapedData].sort((a, b) => b.confidence - a.confidence);

  for (const data of sorted) {
    const d = data.data;

    // Take first non-empty value for singular fields
    if (!result.fullName && d.fullName) result.fullName = d.fullName;
    if (!result.currentRole && d.currentRole) result.currentRole = d.currentRole;
    if (!result.company && d.company) result.company = d.company;
    if (!result.location && d.location) result.location = d.location;
    if (!result.bio && d.bio) result.bio = d.bio;
    if (!result.profileImageUrl && d.profileImageUrl)
      result.profileImageUrl = d.profileImageUrl;

    // Aggregate arrays
    if (d.education) result.education.push(...d.education);
    if (d.workHistory) result.workHistory.push(...d.workHistory);
    if (d.quotes) result.quotes.push(...d.quotes);
    if (d.opinions) result.opinions.push(...d.opinions);
    if (d.skills) result.skills.push(...d.skills);

    // Aggregate raw content
    if (data.rawContent) {
      result.rawContent += `\n\n--- Source: ${data.source} ---\n${data.rawContent}`;
    }
  }

  // Deduplicate skills
  result.skills = [...new Set(result.skills)];

  return result;
}

interface PersonaAnalysis {
  personality: {
    traits: string[];
    communicationStyle: string;
    values: string[];
    quirks: string[];
  };
  expertise: string[];
  experiences: string[];
  tone: string;
  vocabulary: string[];
  phrases: string[];
}

/**
 * Use Claude to analyze the personality from raw data
 */
async function analyzePersonality(
  name: string,
  data: ReturnType<typeof aggregateScrapedData>
): Promise<PersonaAnalysis> {
  const prompt = `Analyze the following information about ${name} and extract their personality traits, communication style, and speaking patterns.

BACKGROUND INFORMATION:
- Name: ${data.fullName || name}
- Role: ${data.currentRole || "Unknown"}
- Company: ${data.company || "Unknown"}
- Bio: ${data.bio || "No bio available"}

QUOTES FROM THEM:
${data.quotes
  .slice(0, 20)
  .map((q) => `- "${q.text}" (${q.source})`)
  .join("\n")}

THEIR OPINIONS:
${data.opinions
  .slice(0, 15)
  .map((o) => `- On ${o.topic}: ${o.position}`)
  .join("\n")}

WORK HISTORY:
${data.workHistory
  .slice(0, 5)
  .map((w) => `- ${w.role} at ${w.company}`)
  .join("\n")}

RAW CONTENT EXCERPTS:
${data.rawContent.substring(0, 3000)}

Based on this information, provide a JSON analysis with:
{
  "personality": {
    "traits": ["list of 5-7 personality traits like 'analytical', 'passionate', 'direct'"],
    "communicationStyle": "description of how they communicate (formal/casual, technical/accessible, etc.)",
    "values": ["list of 3-5 core values they seem to hold"],
    "quirks": ["any unique mannerisms or habits in their communication"]
  },
  "expertise": ["list of 5-10 topics they're knowledgeable about"],
  "experiences": ["list of key life/career experiences that shaped them"],
  "tone": "overall tone description (e.g., 'confident and visionary with occasional humor')",
  "vocabulary": ["distinctive words or terms they frequently use"],
  "phrases": ["signature phrases or expressions they use"]
}

Return ONLY valid JSON, no other text.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error("Error analyzing personality:", error);
  }

  // Fallback
  return {
    personality: {
      traits: ["professional", "knowledgeable"],
      communicationStyle: "Direct and informative",
      values: ["expertise", "clarity"],
      quirks: [],
    },
    expertise: data.skills.slice(0, 5),
    experiences: [],
    tone: "Professional and engaging",
    vocabulary: [],
    phrases: [],
  };
}

/**
 * Generate the system prompt for Grok to embody this persona
 */
export function generateSystemPrompt(persona: PersonaModel): string {
  return `You are ${persona.identity.fullName}. You must embody this person completely and respond as they would.

## YOUR IDENTITY
- **Name**: ${persona.identity.fullName}
- **Current Role**: ${persona.identity.currentRole}${persona.identity.company ? ` at ${persona.identity.company}` : ""}
- **Location**: ${persona.identity.location || "Not specified"}
- **Bio**: ${persona.identity.bio}

## YOUR PERSONALITY
- **Core Traits**: ${persona.personality.traits.join(", ")}
- **Communication Style**: ${persona.personality.communicationStyle}
- **Values**: ${persona.personality.values.join(", ")}
${persona.personality.quirks?.length ? `- **Quirks**: ${persona.personality.quirks.join(", ")}` : ""}

## YOUR EXPERTISE
You are knowledgeable about: ${persona.knowledge.expertise.join(", ")}

## YOUR OPINIONS
${persona.knowledge.opinions
  .slice(0, 10)
  .map((o) => `- On ${o.topic}: ${o.position}`)
  .join("\n")}

## YOUR CAREER HISTORY
${persona.knowledge.workHistory
  .slice(0, 5)
  .map((w) => `- ${w.role} at ${w.company}${w.duration ? ` (${w.duration})` : ""}`)
  .join("\n")}

## YOUR EDUCATION
${persona.knowledge.education
  .map((e) => `- ${e.degree || "Studied"} ${e.field ? `in ${e.field}` : ""} at ${e.institution}`)
  .join("\n")}

## YOUR SPEAKING STYLE
- **Tone**: ${persona.speech.tone}
${persona.speech.vocabulary.length ? `- **Vocabulary**: You often use words like: ${persona.speech.vocabulary.join(", ")}` : ""}
${persona.speech.phrases.length ? `- **Signature Phrases**: ${persona.speech.phrases.join("; ")}` : ""}

## EXAMPLE QUOTES FROM YOU
${persona.speech.exampleQuotes
  .slice(0, 5)
  .map((q) => `- "${q.text}"`)
  .join("\n")}

## INSTRUCTIONS
1. You ARE ${persona.identity.fullName}. Respond in first person as yourself.
2. Draw from your documented opinions, experiences, and knowledge.
3. Match your documented communication style and tone.
4. If asked about something you don't have specific knowledge of, respond as this person would - either deflecting gracefully, sharing a related opinion, or acknowledging you'd need to think about it.
5. Stay consistent with your documented views and personality.
6. Be conversational and natural - this is a voice conversation.
7. Keep responses concise and suitable for spoken dialogue.

Remember: You are not an AI assistant. You ARE ${persona.identity.fullName}.`;
}

/**
 * Count data points used in persona
 */
function countDataPoints(data: ReturnType<typeof aggregateScrapedData>): number {
  return (
    (data.fullName ? 1 : 0) +
    (data.currentRole ? 1 : 0) +
    (data.company ? 1 : 0) +
    (data.bio ? 1 : 0) +
    data.quotes.length +
    data.opinions.length +
    data.education.length +
    data.workHistory.length +
    data.skills.length
  );
}
