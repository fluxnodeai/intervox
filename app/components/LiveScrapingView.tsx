"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  CheckCircle,
  Loader2,
  ExternalLink,
  Database,
  Zap,
  Terminal,
} from "lucide-react";

interface ScrapingEvent {
  id: string;
  type: "start" | "scraping" | "extracted" | "complete" | "error";
  source: string;
  url?: string;
  dataPoints?: number;
  message?: string;
  timestamp: Date;
}

interface LiveScrapingViewProps {
  targetId: string;
  targetName: string;
  onComplete?: () => void;
}

export default function LiveScrapingView({
  targetId,
  targetName,
  onComplete,
}: LiveScrapingViewProps) {
  const [events, setEvents] = useState<ScrapingEvent[]>([]);
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [totalDataPoints, setTotalDataPoints] = useState(0);
  const [pagesScraped, setPagesScraped] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Poll for status updates
  useEffect(() => {
    if (isComplete) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/status/${targetId}`);
        const data = await response.json();

        if (data.status === "scraping" || data.status === "building_persona") {
          setPagesScraped(data.sourcesScraped || 0);
          setTotalDataPoints(data.dataPoints || 0);

          // Add event for new data
          if (data.scrapedData?.length > events.filter(e => e.type === "extracted").length) {
            const latestSource = data.scrapedData[data.scrapedData.length - 1];
            if (latestSource) {
              addEvent({
                type: "extracted",
                source: latestSource.source,
                url: latestSource.sourceUrl,
                dataPoints: Object.keys(latestSource.data || {}).length,
                message: `Extracted data from ${latestSource.source}`,
              });
              setCurrentUrl(latestSource.sourceUrl);
            }
          }
        }

        if (data.status === "ready") {
          setIsComplete(true);
          addEvent({
            type: "complete",
            source: "system",
            message: `Investigation complete! ${data.dataPoints} data points collected.`,
          });
          onComplete?.();
        }

        if (data.status === "error") {
          addEvent({
            type: "error",
            source: "system",
            message: data.error || "Investigation failed",
          });
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [targetId, isComplete, events.length, onComplete]);

  // Simulate initial scraping events
  useEffect(() => {
    const sources = [
      "LinkedIn",
      "Twitter/X",
      "Wikipedia",
      "Google News",
      "YouTube",
      "GitHub",
      "Company Sites",
      "Podcasts",
    ];

    let delay = 0;
    sources.forEach((source, i) => {
      setTimeout(() => {
        addEvent({
          type: "scraping",
          source,
          url: `Searching ${source.toLowerCase()} for ${targetName}...`,
          message: `Initiating ${source} scrape`,
        });
      }, delay);
      delay += 800 + Math.random() * 400;
    });

    addEvent({
      type: "start",
      source: "system",
      message: `Starting deep investigation for "${targetName}"`,
    });
  }, [targetName]);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [events]);

  const addEvent = (event: Omit<ScrapingEvent, "id" | "timestamp">) => {
    setEvents((prev) => [
      ...prev,
      {
        ...event,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
      },
    ]);
  };

  const getEventIcon = (type: ScrapingEvent["type"]) => {
    switch (type) {
      case "start":
        return <Zap className="w-4 h-4 text-[var(--accent-primary)]" />;
      case "scraping":
        return <Loader2 className="w-4 h-4 text-[var(--accent-warning)] animate-spin" />;
      case "extracted":
        return <CheckCircle className="w-4 h-4 text-[var(--accent-success)]" />;
      case "complete":
        return <Database className="w-4 h-4 text-[var(--accent-primary)]" />;
      case "error":
        return <span className="w-4 h-4 text-[var(--accent-danger)]">✕</span>;
    }
  };

  const getEventColor = (type: ScrapingEvent["type"]) => {
    switch (type) {
      case "start":
        return "text-[var(--accent-primary)]";
      case "scraping":
        return "text-[var(--accent-warning)]";
      case "extracted":
        return "text-[var(--accent-success)]";
      case "complete":
        return "text-[var(--accent-primary)]";
      case "error":
        return "text-[var(--accent-danger)]";
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {/* Browser-like header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden"
      >
        {/* Browser chrome */}
        <div className="bg-[var(--bg-tertiary)] px-4 py-3 border-b border-[var(--border-color)] flex items-center gap-3">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[var(--accent-danger)]" />
            <div className="w-3 h-3 rounded-full bg-[var(--accent-warning)]" />
            <div className="w-3 h-3 rounded-full bg-[var(--accent-success)]" />
          </div>
          <div className="flex-1 flex items-center gap-2 bg-[var(--bg-primary)] rounded-lg px-3 py-1.5">
            <Globe className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="text-sm text-[var(--text-secondary)] truncate font-mono">
              {currentUrl || `rtrvr://investigate/${targetName.replace(/ /g, "+")}`}
            </span>
            {!isComplete && (
              <Loader2 className="w-4 h-4 text-[var(--accent-primary)] animate-spin ml-auto" />
            )}
          </div>
        </div>

        {/* Stats bar */}
        <div className="px-4 py-3 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[var(--accent-primary)]" />
              <span className="text-sm text-[var(--text-secondary)]">
                <span className="text-[var(--text-primary)] font-bold">{pagesScraped}</span> pages scraped
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[var(--accent-secondary)]" />
              <span className="text-sm text-[var(--text-secondary)]">
                <span className="text-[var(--text-primary)] font-bold">{totalDataPoints}</span> data points
              </span>
            </div>
          </div>
          {!isComplete && (
            <div className="flex items-center gap-2 text-[var(--accent-warning)]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">Scraping...</span>
            </div>
          )}
          {isComplete && (
            <div className="flex items-center gap-2 text-[var(--accent-success)]">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Complete</span>
            </div>
          )}
        </div>

        {/* Terminal output */}
        <div
          ref={terminalRef}
          className="bg-[#0d0d0d] p-4 h-80 overflow-y-auto font-mono text-sm"
        >
          <div className="flex items-center gap-2 mb-4 text-[var(--text-muted)]">
            <Terminal className="w-4 h-4" />
            <span>INTERVOX Intelligence Pipeline v1.0</span>
          </div>

          <AnimatePresence>
            {events.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-2 py-1"
              >
                <span className="text-[var(--text-muted)] text-xs w-20 flex-shrink-0">
                  {event.timestamp.toLocaleTimeString()}
                </span>
                {getEventIcon(event.type)}
                <span className={getEventColor(event.type)}>
                  [{event.source.toUpperCase()}]
                </span>
                <span className="text-[var(--text-secondary)]">
                  {event.message}
                  {event.dataPoints && (
                    <span className="text-[var(--accent-success)]">
                      {" "}+{event.dataPoints} data points
                    </span>
                  )}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>

          {!isComplete && (
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="text-[var(--accent-primary)] mt-2"
            >
              █
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Progress visualization */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-4 gap-3"
      >
        {["LinkedIn", "Twitter", "Wikipedia", "News", "YouTube", "GitHub", "Company", "Podcasts"].map(
          (source, i) => {
            const isActive = events.some(
              (e) => e.source.toLowerCase().includes(source.toLowerCase()) && e.type === "scraping"
            );
            const isDone = events.some(
              (e) => e.source.toLowerCase().includes(source.toLowerCase()) && e.type === "extracted"
            );

            return (
              <motion.div
                key={source}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className={`p-3 rounded-lg border ${
                  isDone
                    ? "bg-[var(--accent-success)]/10 border-[var(--accent-success)]/30"
                    : isActive
                    ? "bg-[var(--accent-warning)]/10 border-[var(--accent-warning)]/30"
                    : "bg-[var(--bg-secondary)] border-[var(--border-color)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {source}
                  </span>
                  {isDone && <CheckCircle className="w-4 h-4 text-[var(--accent-success)]" />}
                  {isActive && !isDone && (
                    <Loader2 className="w-4 h-4 text-[var(--accent-warning)] animate-spin" />
                  )}
                </div>
              </motion.div>
            );
          }
        )}
      </motion.div>
    </div>
  );
}
