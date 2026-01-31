/**
 * INTERVOX Shared Types
 * Core type definitions used across all modules
 */

// ============================================
// Investigation Types
// ============================================

export type InvestigationStatus =
  | "pending"
  | "confirming_identity"
  | "scraping"
  | "building_persona"
  | "ready"
  | "error";

export interface InvestigationRequest {
  targetName: string;
  targetContext?: string;
  depth: "quick" | "standard" | "deep";
}

export interface IdentityCandidate {
  id: string;
  name: string;
  description: string;
  confidence: number;
  sources: string[];
  thumbnail?: string;
}

export interface IdentityConfirmation {
  confirmed: boolean;
  selectedCandidateId?: string;
  additionalContext?: string;
}

export interface InvestigationResult {
  targetId: string;
  targetName: string;
  status: InvestigationStatus;
  identityCandidates?: IdentityCandidate[];
  confirmedIdentity?: IdentityCandidate;
  sourcesScraped: number;
  dataPoints: number;
  scrapedData: ScrapedData[];
  persona?: PersonaModel;
  conversationId?: string;
  error?: string;
}

// ============================================
// Scraper Types
// ============================================

export type SourceType =
  | "linkedin"
  | "twitter"
  | "wikipedia"
  | "news"
  | "company"
  | "podcast"
  | "youtube"
  | "github"
  | "google"
  | "other";

export interface ScrapeRequest {
  targetName: string;
  targetContext?: string;
  sources: SourceType[];
  confirmedIdentity?: IdentityCandidate;
}

export interface ScrapedData {
  id: string;
  source: SourceType;
  sourceUrl: string;
  scrapedAt: string;
  confidence: number;
  data: PersonData;
  rawContent?: string;
}

export interface PersonData {
  fullName?: string;
  currentRole?: string;
  company?: string;
  location?: string;
  bio?: string;
  profileImageUrl?: string;
  education?: Education[];
  workHistory?: WorkExperience[];
  quotes?: Quote[];
  opinions?: Opinion[];
  skills?: string[];
  socialLinks?: SocialLink[];
}

export interface Education {
  institution: string;
  degree?: string;
  field?: string;
  years?: string;
}

export interface WorkExperience {
  company: string;
  role: string;
  duration?: string;
  description?: string;
}

export interface Quote {
  text: string;
  source: string;
  date?: string;
  context?: string;
}

export interface Opinion {
  topic: string;
  position: string;
  source?: string;
  confidence: number;
}

export interface SocialLink {
  platform: string;
  url: string;
  username?: string;
}

// ============================================
// Persona Types
// ============================================

export interface PersonaModel {
  targetId: string;
  targetName: string;
  identity: {
    fullName: string;
    currentRole: string;
    company?: string;
    location?: string;
    bio: string;
    profileImageUrl?: string;
  };
  personality: {
    traits: string[];
    communicationStyle: string;
    values: string[];
    quirks?: string[];
  };
  knowledge: {
    expertise: string[];
    opinions: Opinion[];
    experiences: string[];
    education: Education[];
    workHistory: WorkExperience[];
  };
  speech: {
    tone: string;
    vocabulary: string[];
    phrases: string[];
    exampleQuotes: Quote[];
  };
  systemPrompt: string;
  createdAt: string;
  dataPointsUsed: number;
}

// ============================================
// Voice Conversation Types
// ============================================

export interface ConversationSession {
  id: string;
  personaId: string;
  personaName: string;
  startedAt: string;
  messages: ConversationMessage[];
  status: "active" | "ended";
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  audioUrl?: string;
}

export interface VoiceConfig {
  voiceId: string;
  stability: number;
  similarityBoost: number;
  style?: number;
}

// ============================================
// UI State Types
// ============================================

export interface AppState {
  currentInvestigation: InvestigationResult | null;
  isInvestigating: boolean;
  conversationSession: ConversationSession | null;
  isVoiceActive: boolean;
}

export interface DataSourcePanel {
  source: SourceType;
  status: "pending" | "scraping" | "completed" | "error";
  dataCount: number;
  lastUpdated?: string;
}
