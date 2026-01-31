"use client";

import { motion } from "framer-motion";
import {
  Loader2,
  CheckCircle,
  Globe,
  Linkedin,
  Twitter,
  Newspaper,
  Youtube,
  Github,
  Building,
  Mic,
  BookOpen,
} from "lucide-react";
import { InvestigationResult, SourceType } from "@/shared/types";

interface InvestigationProgressProps {
  investigation: InvestigationResult;
}

const SOURCE_ICONS: Record<SourceType, React.ReactNode> = {
  google: <Globe className="w-4 h-4" />,
  linkedin: <Linkedin className="w-4 h-4" />,
  twitter: <Twitter className="w-4 h-4" />,
  wikipedia: <BookOpen className="w-4 h-4" />,
  news: <Newspaper className="w-4 h-4" />,
  youtube: <Youtube className="w-4 h-4" />,
  github: <Github className="w-4 h-4" />,
  company: <Building className="w-4 h-4" />,
  podcast: <Mic className="w-4 h-4" />,
  other: <Globe className="w-4 h-4" />,
};

const SOURCE_NAMES: Record<SourceType, string> = {
  google: "Google",
  linkedin: "LinkedIn",
  twitter: "Twitter/X",
  wikipedia: "Wikipedia",
  news: "News",
  youtube: "YouTube",
  github: "GitHub",
  company: "Company",
  podcast: "Podcasts",
  other: "Other",
};

export default function InvestigationProgress({
  investigation,
}: InvestigationProgressProps) {
  const { status, scrapedData, sourcesScraped, dataPoints, targetName } =
    investigation;

  const isComplete = status === "ready";
  const isError = status === "error";

  // Get unique sources
  const scrapedSources = new Set(scrapedData.map((d) => d.source));
  const allSources: SourceType[] = [
    "google",
    "linkedin",
    "twitter",
    "wikipedia",
    "news",
    "youtube",
    "github",
    "company",
    "podcast",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-3xl mx-auto"
    >
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[var(--border-color)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-[var(--text-primary)]">
                Investigating: {targetName}
              </h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                {status === "scraping" && "Gathering data from public sources..."}
                {status === "building_persona" && "Building persona model..."}
                {status === "ready" && "Investigation complete"}
                {status === "error" && "Investigation failed"}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-[var(--accent-primary)]">
                {dataPoints}
              </div>
              <div className="text-xs text-[var(--text-muted)]">data points</div>
            </div>
          </div>
        </div>

        {/* Sources Grid */}
        <div className="p-6">
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {allSources.map((source) => {
              const isScraped = scrapedSources.has(source);
              const sourceData = scrapedData.find((d) => d.source === source);

              return (
                <motion.div
                  key={source}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`p-3 rounded-lg border ${
                    isScraped
                      ? "bg-[var(--accent-success)]/10 border-[var(--accent-success)]/30"
                      : "bg-[var(--bg-tertiary)] border-[var(--border-color)]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={
                        isScraped
                          ? "text-[var(--accent-success)]"
                          : "text-[var(--text-muted)]"
                      }
                    >
                      {SOURCE_ICONS[source]}
                    </span>
                    {isScraped ? (
                      <CheckCircle className="w-3 h-3 text-[var(--accent-success)]" />
                    ) : status === "scraping" ? (
                      <Loader2 className="w-3 h-3 text-[var(--text-muted)] animate-spin" />
                    ) : null}
                  </div>
                  <div className="text-xs font-medium text-[var(--text-primary)]">
                    {SOURCE_NAMES[source]}
                  </div>
                  {sourceData && (
                    <div className="text-xs text-[var(--text-muted)] mt-1">
                      {sourceData.confidence}% conf
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Stats Bar */}
        <div className="px-6 py-4 bg-[var(--bg-tertiary)] border-t border-[var(--border-color)] flex items-center justify-between">
          <div className="flex gap-6">
            <div>
              <span className="text-[var(--accent-primary)] font-bold">
                {sourcesScraped}
              </span>
              <span className="text-[var(--text-muted)] text-sm ml-1">
                sources scraped
              </span>
            </div>
            <div>
              <span className="text-[var(--accent-secondary)] font-bold">
                {dataPoints}
              </span>
              <span className="text-[var(--text-muted)] text-sm ml-1">
                data points
              </span>
            </div>
          </div>

          {isComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 text-[var(--accent-success)]"
            >
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">Persona Ready</span>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
