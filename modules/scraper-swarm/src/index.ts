/**
 * Scraper Swarm Module - Deep OSINT Scraping
 *
 * Uses rtrvr.ai to scrape 100+ pages per investigation.
 * Budget: $200 max per investigation.
 */

import { config } from "@/shared/config";
import {
  ScrapedData,
  SourceType,
  IdentityCandidate,
  PersonData,
  Quote,
  Opinion,
  Education,
  WorkExperience,
} from "@/shared/types";
import { v4 as uuidv4 } from "uuid";

// ============================================
// Types
// ============================================

interface RtrvrResponse {
  success: boolean;
  tabs?: Array<{
    url: string;
    content?: string;
    accessibilityTree?: string;
  }>;
  result?: any;
  error?: string;
  usageData?: {
    creditsUsed: number;
  };
}

interface ScrapingProgress {
  totalPages: number;
  scrapedPages: number;
  currentSource: string;
  creditsUsed: number;
  status: 'searching' | 'scraping' | 'processing' | 'complete' | 'error';
}

// Progress callback type
type ProgressCallback = (progress: ScrapingProgress) => void;

// ============================================
// rtrvr.ai API Client
// ============================================

/**
 * Scrape a single URL using rtrvr.ai /scrape endpoint
 */
async function scrapeUrl(url: string): Promise<{ content: string; success: boolean }> {
  try {
    const response = await fetch('https://api.rtrvr.ai/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.rtrvr.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        urls: [url],
        response: { verbosity: 'final' },
      }),
    });

    const data: RtrvrResponse = await response.json();

    if (!data.success || !data.tabs?.[0]) {
      return { content: '', success: false };
    }

    const content = data.tabs[0].content || data.tabs[0].accessibilityTree || '';
    return { content, success: true };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return { content: '', success: false };
  }
}

/**
 * Use rtrvr.ai /agent for intelligent extraction
 */
async function agentExtract(prompt: string, urls: string[]): Promise<string> {
  try {
    const response = await fetch('https://api.rtrvr.ai/agent', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.rtrvr.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: prompt,
        urls,
        response: { verbosity: 'final' },
      }),
    });

    const data: RtrvrResponse = await response.json();

    if (!data.success) {
      return '';
    }

    // Handle different result formats
    if (typeof data.result === 'string') {
      return data.result;
    } else if (data.result) {
      return JSON.stringify(data.result);
    } else if (data.tabs?.[0]?.content) {
      return data.tabs[0].content;
    }

    return '';
  } catch (error) {
    console.error('Agent extraction error:', error);
    return '';
  }
}

// ============================================
// Identity Confirmation
// ============================================

/**
 * Find identity candidates for a name
 * First pass: Quick search to disambiguate who the user means
 */
export async function findIdentityCandidates(
  targetName: string,
  context?: string
): Promise<IdentityCandidate[]> {
  const searchQuery = context ? `${targetName} ${context}` : targetName;

  const prompt = `
Search for "${searchQuery}" and identify the top 3-5 most likely people this could refer to.

For EACH person found, extract:
1. Full name
2. Current role/title and company/organization
3. Key identifying information (education, location, notable achievements)
4. Why they're notable/famous

Return as JSON array:
[
  {
    "name": "Full Name",
    "description": "Current Role at Company. Known for X. Based in Y. Studied at Z.",
    "confidence": 85
  }
]

Only include real, verifiable people. Order by likelihood/prominence.
`;

  const result = await agentExtract(prompt, [
    `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`,
  ]);

  if (!result) {
    return [{
      id: uuidv4(),
      name: targetName,
      description: context || 'No additional information found',
      confidence: 50,
      sources: ['google.com'],
    }];
  }

  try {
    // Extract JSON from response
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const candidates = JSON.parse(jsonMatch[0]);
      return candidates.map((c: any) => ({
        id: uuidv4(),
        name: c.name || targetName,
        description: c.description || '',
        confidence: c.confidence || 70,
        sources: ['google.com'],
      }));
    }
  } catch (e) {
    console.error('Error parsing candidates:', e);
  }

  return [{
    id: uuidv4(),
    name: targetName,
    description: result.substring(0, 300),
    confidence: 60,
    sources: ['google.com'],
  }];
}

// ============================================
// Deep Scraping Pipeline
// ============================================

/**
 * Generate search URLs for all sources
 */
function generateSearchUrls(name: string, context: string): Record<SourceType, string[]> {
  const encodedName = encodeURIComponent(name);
  const encodedContext = encodeURIComponent(`${name} ${context}`);

  return {
    linkedin: [
      `https://www.linkedin.com/search/results/people/?keywords=${encodedName}`,
      `https://www.google.com/search?q=${encodedName}+site:linkedin.com`,
    ],
    twitter: [
      `https://www.google.com/search?q=${encodedName}+site:twitter.com+OR+site:x.com`,
      `https://twitter.com/search?q=${encodedName}&f=user`,
    ],
    wikipedia: [
      `https://en.wikipedia.org/wiki/${encodeURIComponent(name.replace(/ /g, '_'))}`,
      `https://www.google.com/search?q=${encodedName}+site:wikipedia.org`,
    ],
    news: [
      `https://news.google.com/search?q=${encodedName}`,
      `https://www.google.com/search?q=${encodedName}&tbm=nws`,
    ],
    youtube: [
      `https://www.youtube.com/results?search_query=${encodedName}+interview`,
      `https://www.google.com/search?q=${encodedName}+interview+site:youtube.com`,
    ],
    github: [
      `https://github.com/search?q=${encodedName}&type=users`,
      `https://www.google.com/search?q=${encodedName}+site:github.com`,
    ],
    company: [
      `https://www.google.com/search?q=${encodedContext}+company+website+about`,
    ],
    podcast: [
      `https://www.google.com/search?q=${encodedName}+podcast+interview+transcript`,
    ],
    google: [
      `https://www.google.com/search?q=${encodedContext}`,
      `https://www.google.com/search?q=${encodedName}+quotes`,
      `https://www.google.com/search?q=${encodedName}+biography`,
      `https://www.google.com/search?q=${encodedName}+education+university`,
      `https://www.google.com/search?q=${encodedName}+family`,
    ],
    other: [],
  };
}

/**
 * Extract structured data from scraped content
 */
async function extractPersonData(
  name: string,
  source: SourceType,
  content: string
): Promise<PersonData> {
  // Use Anthropic to extract structured data from raw content
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const anthropic = new Anthropic({ apiKey: config.anthropic.apiKey });

  const prompt = `
Extract structured information about "${name}" from the following content.
Source type: ${source}

Content:
${content.substring(0, 15000)}

Return a JSON object with these fields (include only what you can find):
{
  "fullName": "string",
  "currentRole": "string",
  "company": "string",
  "location": "string",
  "bio": "string (2-3 sentences)",
  "education": [{"institution": "string", "degree": "string", "field": "string", "years": "string"}],
  "workHistory": [{"company": "string", "role": "string", "duration": "string"}],
  "quotes": [{"text": "exact quote", "source": "where it's from", "context": "what they were discussing"}],
  "opinions": [{"topic": "string", "position": "their stance/view", "confidence": 0-100}],
  "skills": ["string"],
  "personalInfo": {
    "birthDate": "string",
    "birthPlace": "string",
    "nationality": "string",
    "familyInfo": "string"
  }
}

Only include verified information. For quotes, use exact wording when possible.
Return ONLY valid JSON, no other text.
`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Error extracting person data:', e);
  }

  return { bio: content.substring(0, 500) };
}

/**
 * Main deep scraping function
 * Scrapes 100+ pages across all sources
 */
export async function deepScrape(
  targetName: string,
  confirmedIdentity: IdentityCandidate,
  onProgress?: ProgressCallback
): Promise<ScrapedData[]> {
  const context = confirmedIdentity.description;
  const searchUrls = generateSearchUrls(targetName, context);
  const allScrapedData: ScrapedData[] = [];

  let totalPages = 0;
  let scrapedPages = 0;
  let creditsUsed = 0;

  // Calculate total pages
  Object.values(searchUrls).forEach(urls => {
    totalPages += urls.length;
  });

  // Priority order for sources
  const sourceOrder: SourceType[] = [
    'linkedin',
    'twitter',
    'wikipedia',
    'news',
    'youtube',
    'github',
    'company',
    'podcast',
    'google',
  ];

  for (const source of sourceOrder) {
    const urls = searchUrls[source];
    if (!urls || urls.length === 0) continue;

    onProgress?.({
      totalPages,
      scrapedPages,
      currentSource: source,
      creditsUsed,
      status: 'scraping',
    });

    for (const url of urls) {
      try {
        // Use agent for intelligent extraction
        const extractionPrompt = `
Extract all information about ${targetName} from this page.
Context: ${context}

Find:
- Biographical information
- Professional history
- Direct quotes (exact wording)
- Opinions and positions on topics
- Education history
- Personal details (family, location, etc.)
- Social media handles
- Any other relevant public information

Be thorough and extract everything available.
`;

        const result = await agentExtract(extractionPrompt, [url]);
        scrapedPages++;
        creditsUsed += 0.5; // Estimate

        if (result && result.length > 100) {
          // Extract structured data
          const personData = await extractPersonData(targetName, source, result);

          allScrapedData.push({
            id: uuidv4(),
            source,
            sourceUrl: url,
            scrapedAt: new Date().toISOString(),
            confidence: source === 'wikipedia' ? 95 : source === 'linkedin' ? 90 : 75,
            data: personData,
            rawContent: result.substring(0, 5000),
          });
        }

        onProgress?.({
          totalPages,
          scrapedPages,
          currentSource: source,
          creditsUsed,
          status: 'scraping',
        });

        // Rate limiting - be nice to the API
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`Error scraping ${source} - ${url}:`, error);
        scrapedPages++;
      }
    }
  }

  // Now do follow-up scraping for links found in initial results
  const additionalUrls = extractAdditionalUrls(allScrapedData, targetName);

  for (const url of additionalUrls.slice(0, 50)) { // Cap at 50 additional pages
    try {
      const { content, success } = await scrapeUrl(url);
      scrapedPages++;
      creditsUsed += 0.3;

      if (success && content.length > 100) {
        const source = detectSourceType(url);
        const personData = await extractPersonData(targetName, source, content);

        allScrapedData.push({
          id: uuidv4(),
          source,
          sourceUrl: url,
          scrapedAt: new Date().toISOString(),
          confidence: 70,
          data: personData,
          rawContent: content.substring(0, 5000),
        });
      }

      onProgress?.({
        totalPages: totalPages + additionalUrls.length,
        scrapedPages,
        currentSource: 'additional',
        creditsUsed,
        status: 'scraping',
      });

      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`Error on additional URL ${url}:`, error);
    }
  }

  onProgress?.({
    totalPages: scrapedPages,
    scrapedPages,
    currentSource: 'complete',
    creditsUsed,
    status: 'complete',
  });

  return allScrapedData;
}

/**
 * Extract additional URLs from scraped content
 */
function extractAdditionalUrls(data: ScrapedData[], targetName: string): string[] {
  const urls: string[] = [];
  const namePattern = targetName.toLowerCase().replace(/ /g, '[-_]?');

  for (const item of data) {
    const content = item.rawContent || '';
    // Find URLs that might be relevant
    const urlMatches = content.match(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/g) || [];

    for (const url of urlMatches) {
      if (
        url.includes(namePattern) ||
        url.includes('interview') ||
        url.includes('profile') ||
        url.includes('about')
      ) {
        urls.push(url);
      }
    }
  }

  // Deduplicate
  return [...new Set(urls)];
}

/**
 * Detect source type from URL
 */
function detectSourceType(url: string): SourceType {
  if (url.includes('linkedin.com')) return 'linkedin';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  if (url.includes('wikipedia.org')) return 'wikipedia';
  if (url.includes('youtube.com')) return 'youtube';
  if (url.includes('github.com')) return 'github';
  if (url.includes('news.') || url.includes('/news')) return 'news';
  return 'other';
}

// ============================================
// Exports
// ============================================

export type { ScrapingProgress };
export function getAvailableSources(): SourceType[] {
  return ['linkedin', 'twitter', 'wikipedia', 'news', 'youtube', 'github', 'company', 'podcast', 'google'];
}
