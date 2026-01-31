/**
 * Scraper Swarm Module
 *
 * Uses rtrvr.ai to scrape public information about a target person.
 * Includes identity confirmation to disambiguate between people with the same name.
 */

import { config } from "@/shared/config";
import {
  ScrapedData,
  SourceType,
  ScrapeRequest,
  IdentityCandidate,
  PersonData,
} from "@/shared/types";
import { v4 as uuidv4 } from "uuid";

// ============================================
// rtrvr.ai API Client
// ============================================

interface RtrvrScrapeResponse {
  success: boolean;
  content?: string;
  error?: string;
}

interface RtrvrAgentResponse {
  success: boolean;
  result?: string;
  error?: string;
}

/**
 * Call rtrvr.ai /scrape endpoint for raw page content
 */
async function rtrvrScrape(urls: string[]): Promise<RtrvrScrapeResponse> {
  const response = await fetch(`${config.rtrvr.baseUrl}/scrape`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.rtrvr.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      urls,
      response: { verbosity: "final" },
    }),
  });

  if (!response.ok) {
    return { success: false, error: `HTTP ${response.status}` };
  }

  const data = await response.json();
  return { success: true, content: data.content || data.result };
}

/**
 * Call rtrvr.ai /agent endpoint for AI-powered extraction
 */
async function rtrvrAgent(
  input: string,
  urls: string[]
): Promise<RtrvrAgentResponse> {
  const response = await fetch(`${config.rtrvr.baseUrl}/agent`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.rtrvr.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input,
      urls,
      response: { verbosity: "final" },
    }),
  });

  if (!response.ok) {
    return { success: false, error: `HTTP ${response.status}` };
  }

  const data = await response.json();
  return { success: true, result: data.result || data.content };
}

// ============================================
// Identity Confirmation
// ============================================

/**
 * Search for potential identity matches
 * Returns candidates for user confirmation
 */
export async function findIdentityCandidates(
  targetName: string,
  context?: string
): Promise<IdentityCandidate[]> {
  const searchQuery = context
    ? `${targetName} ${context}`
    : targetName;

  // Search Google for the person
  const searchPrompt = `
Search for "${searchQuery}" and find the top 3-5 most likely matches for this person.
For each match, provide:
- Their full name
- Current role/title and company
- Key identifying information (education, location, notable achievements)
- Confidence score (0-100) that this is a notable/public figure

Return the results as a JSON array with this structure:
[
  {
    "name": "Full Name",
    "description": "Current Role at Company. Notable for X. Studied at Y University.",
    "confidence": 85,
    "sources": ["url1", "url2"]
  }
]

Focus on finding distinct individuals, not multiple entries for the same person.
`;

  const result = await rtrvrAgent(searchPrompt, [
    `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`,
    `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(targetName)}`,
  ]);

  if (!result.success || !result.result) {
    // Fallback: return a single candidate based on the search
    return [
      {
        id: uuidv4(),
        name: targetName,
        description: context || "No additional context available",
        confidence: 50,
        sources: ["google.com"],
      },
    ];
  }

  try {
    // Parse the JSON response
    const parsed = JSON.parse(result.result);
    return parsed.map((candidate: any) => ({
      id: uuidv4(),
      name: candidate.name || targetName,
      description: candidate.description || "",
      confidence: candidate.confidence || 50,
      sources: candidate.sources || [],
      thumbnail: candidate.thumbnail,
    }));
  } catch {
    // If parsing fails, return basic candidate
    return [
      {
        id: uuidv4(),
        name: targetName,
        description: result.result.substring(0, 200),
        confidence: 60,
        sources: ["google.com"],
      },
    ];
  }
}

// ============================================
// Source-Specific Scrapers
// ============================================

const SOURCE_SCRAPERS: Record<
  SourceType,
  (name: string, context?: string) => Promise<ScrapedData | null>
> = {
  linkedin: scrapeLinkedIn,
  twitter: scrapeTwitter,
  wikipedia: scrapeWikipedia,
  news: scrapeNews,
  company: scrapeCompany,
  github: scrapeGitHub,
  youtube: scrapeYouTube,
  podcast: scrapePodcasts,
  google: scrapeGoogle,
  other: async () => null,
};

async function scrapeLinkedIn(
  name: string,
  context?: string
): Promise<ScrapedData | null> {
  const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(name)}`;

  const prompt = `
Find the LinkedIn profile for ${name}${context ? ` (${context})` : ""}.
Extract:
- Full name and headline
- Current company and role
- Location
- About/bio section
- Work experience (all positions)
- Education history
- Skills
- Any recommendations or endorsements quotes

Return as structured JSON with fields: fullName, currentRole, company, location, bio, workHistory[], education[], skills[], quotes[]
`;

  const result = await rtrvrAgent(prompt, [searchUrl]);

  if (!result.success) return null;

  return {
    id: uuidv4(),
    source: "linkedin",
    sourceUrl: searchUrl,
    scrapedAt: new Date().toISOString(),
    confidence: 85,
    data: parsePersonData(result.result || ""),
    rawContent: result.result,
  };
}

async function scrapeTwitter(
  name: string,
  context?: string
): Promise<ScrapedData | null> {
  const searchUrl = `https://twitter.com/search?q=${encodeURIComponent(name)}&f=user`;

  const prompt = `
Find the Twitter/X profile for ${name}${context ? ` (${context})` : ""}.
Extract:
- Username and display name
- Bio
- Location
- Recent tweets (last 10-20)
- Opinions expressed on various topics
- Communication style and tone
- Common phrases or expressions they use

Return as structured JSON with fields: fullName, bio, location, quotes[], opinions[], phrases[]
`;

  const result = await rtrvrAgent(prompt, [searchUrl]);

  if (!result.success) return null;

  return {
    id: uuidv4(),
    source: "twitter",
    sourceUrl: searchUrl,
    scrapedAt: new Date().toISOString(),
    confidence: 80,
    data: parsePersonData(result.result || ""),
    rawContent: result.result,
  };
}

async function scrapeWikipedia(
  name: string,
  context?: string
): Promise<ScrapedData | null> {
  const searchUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(name.replace(/ /g, "_"))}`;

  const prompt = `
Find the Wikipedia page for ${name}${context ? ` (${context})` : ""}.
Extract:
- Full biography
- Early life and education
- Career history
- Notable achievements
- Controversies (if any)
- Personal life
- Direct quotes attributed to them
- Their stated opinions and positions

Return as structured JSON with fields: fullName, bio, education[], workHistory[], quotes[], opinions[]
`;

  const result = await rtrvrAgent(prompt, [searchUrl]);

  if (!result.success) return null;

  return {
    id: uuidv4(),
    source: "wikipedia",
    sourceUrl: searchUrl,
    scrapedAt: new Date().toISOString(),
    confidence: 95,
    data: parsePersonData(result.result || ""),
    rawContent: result.result,
  };
}

async function scrapeNews(
  name: string,
  context?: string
): Promise<ScrapedData | null> {
  const searchUrl = `https://news.google.com/search?q=${encodeURIComponent(name)}`;

  const prompt = `
Search for recent news articles about ${name}${context ? ` (${context})` : ""}.
Extract from the top 10 articles:
- Headlines mentioning them
- Direct quotes from them
- What topics they're being covered for
- Their stated positions on issues
- Any controversies or notable events

Return as structured JSON with fields: quotes[], opinions[], topics[]
`;

  const result = await rtrvrAgent(prompt, [searchUrl]);

  if (!result.success) return null;

  return {
    id: uuidv4(),
    source: "news",
    sourceUrl: searchUrl,
    scrapedAt: new Date().toISOString(),
    confidence: 75,
    data: parsePersonData(result.result || ""),
    rawContent: result.result,
  };
}

async function scrapeCompany(
  name: string,
  context?: string
): Promise<ScrapedData | null> {
  const prompt = `
Find the company website for ${name}${context ? ` (${context})` : ""}'s current employer.
Extract:
- Their bio/about page
- Any blog posts or articles they've written
- Press releases mentioning them
- Their official role and responsibilities

Return as structured JSON with fields: fullName, currentRole, company, bio, quotes[]
`;

  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(name + " company website about")}`;
  const result = await rtrvrAgent(prompt, [searchUrl]);

  if (!result.success) return null;

  return {
    id: uuidv4(),
    source: "company",
    sourceUrl: searchUrl,
    scrapedAt: new Date().toISOString(),
    confidence: 70,
    data: parsePersonData(result.result || ""),
    rawContent: result.result,
  };
}

async function scrapeGitHub(
  name: string,
  context?: string
): Promise<ScrapedData | null> {
  const searchUrl = `https://github.com/search?q=${encodeURIComponent(name)}&type=users`;

  const prompt = `
Find the GitHub profile for ${name}${context ? ` (${context})` : ""}.
Extract:
- Username and bio
- Location and company
- Popular repositories
- Programming languages they use
- Contribution activity
- Any README or profile content

Return as structured JSON with fields: fullName, bio, company, location, skills[]
`;

  const result = await rtrvrAgent(prompt, [searchUrl]);

  if (!result.success) return null;

  return {
    id: uuidv4(),
    source: "github",
    sourceUrl: searchUrl,
    scrapedAt: new Date().toISOString(),
    confidence: 80,
    data: parsePersonData(result.result || ""),
    rawContent: result.result,
  };
}

async function scrapeYouTube(
  name: string,
  context?: string
): Promise<ScrapedData | null> {
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(name)}`;

  const prompt = `
Find YouTube videos featuring ${name}${context ? ` (${context})` : ""}.
Look for interviews, talks, podcasts appearances.
Extract:
- Video titles and descriptions
- Direct quotes from them
- Topics they discuss
- Their speaking style and mannerisms
- Opinions they express

Return as structured JSON with fields: quotes[], opinions[], topics[]
`;

  const result = await rtrvrAgent(prompt, [searchUrl]);

  if (!result.success) return null;

  return {
    id: uuidv4(),
    source: "youtube",
    sourceUrl: searchUrl,
    scrapedAt: new Date().toISOString(),
    confidence: 85,
    data: parsePersonData(result.result || ""),
    rawContent: result.result,
  };
}

async function scrapePodcasts(
  name: string,
  context?: string
): Promise<ScrapedData | null> {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(name + " podcast interview")}`;

  const prompt = `
Find podcast appearances by ${name}${context ? ` (${context})` : ""}.
Extract:
- Podcast names and episode titles
- Topics discussed
- Direct quotes
- Their opinions on various subjects
- Personal stories they've shared

Return as structured JSON with fields: quotes[], opinions[], topics[]
`;

  const result = await rtrvrAgent(prompt, [searchUrl]);

  if (!result.success) return null;

  return {
    id: uuidv4(),
    source: "podcast",
    sourceUrl: searchUrl,
    scrapedAt: new Date().toISOString(),
    confidence: 80,
    data: parsePersonData(result.result || ""),
    rawContent: result.result,
  };
}

async function scrapeGoogle(
  name: string,
  context?: string
): Promise<ScrapedData | null> {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(name)}`;

  const prompt = `
Search Google for comprehensive information about ${name}${context ? ` (${context})` : ""}.
Extract:
- Knowledge panel information
- Featured snippets about them
- Notable facts
- Recent activities

Return as structured JSON with fields: fullName, currentRole, company, bio
`;

  const result = await rtrvrAgent(prompt, [searchUrl]);

  if (!result.success) return null;

  return {
    id: uuidv4(),
    source: "google",
    sourceUrl: searchUrl,
    scrapedAt: new Date().toISOString(),
    confidence: 70,
    data: parsePersonData(result.result || ""),
    rawContent: result.result,
  };
}

// ============================================
// Data Parsing Utilities
// ============================================

function parsePersonData(rawResult: string): PersonData {
  try {
    const parsed = JSON.parse(rawResult);
    return {
      fullName: parsed.fullName,
      currentRole: parsed.currentRole,
      company: parsed.company,
      location: parsed.location,
      bio: parsed.bio,
      education: parsed.education,
      workHistory: parsed.workHistory,
      quotes: parsed.quotes?.map((q: any) =>
        typeof q === "string" ? { text: q, source: "unknown" } : q
      ),
      opinions: parsed.opinions?.map((o: any) =>
        typeof o === "string"
          ? { topic: "general", position: o, confidence: 70 }
          : { ...o, confidence: o.confidence || 70 }
      ),
      skills: parsed.skills,
    };
  } catch {
    // If not JSON, extract what we can from raw text
    return {
      bio: rawResult.substring(0, 1000),
    };
  }
}

// ============================================
// Main Scrape Function
// ============================================

/**
 * Scrape all requested sources for a confirmed identity
 */
export async function scrapeAll(request: ScrapeRequest): Promise<ScrapedData[]> {
  const { targetName, targetContext, sources } = request;
  const context = request.confirmedIdentity?.description || targetContext;

  // Run all scrapers in parallel
  const scrapePromises = sources.map(async (source) => {
    const scraper = SOURCE_SCRAPERS[source];
    if (!scraper) return null;

    try {
      return await scraper(targetName, context);
    } catch (error) {
      console.error(`Error scraping ${source}:`, error);
      return null;
    }
  });

  const results = await Promise.all(scrapePromises);

  // Filter out nulls and return
  return results.filter((r): r is ScrapedData => r !== null);
}

/**
 * Get all available source types
 */
export function getAvailableSources(): SourceType[] {
  return [
    "google",
    "linkedin",
    "twitter",
    "wikipedia",
    "news",
    "youtube",
    "podcast",
    "github",
    "company",
  ];
}
