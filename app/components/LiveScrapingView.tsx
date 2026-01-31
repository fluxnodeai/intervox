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
  AlertCircle,
} from "lucide-react";

interface LogEvent {
  id: string;
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  category: string;
  message: string;
  details?: Record<string, any>;
}

interface ScrapingEvent {
  id: string;
  type: "start" | "scraping" | "extracted" | "complete" | "error" | "info";
  source: string;
  url?: string;
  dataPoints?: number;
  message?: string;
  timestamp: Date;
  level?: string;
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
  const [isConnected, setIsConnected] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Connect to SSE for real-time logs
  useEffect(() => {
    if (isComplete) return;

    // Add initial event
    addEvent({
      type: "start",
      source: "system",
      message: `Starting deep investigation for "${targetName}"`,
    });

    // Connect to SSE endpoint
    const eventSource = new EventSource(`/api/events/${targetId}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      console.log("SSE connected");
    };

    eventSource.onmessage = (event) => {
      try {
        const logEvent: LogEvent = JSON.parse(event.data);

        // Convert log event to scraping event
        const scrapingEvent: ScrapingEvent = {
          id: logEvent.id,
          timestamp: new Date(logEvent.timestamp),
          source: logEvent.category,
          message: logEvent.message,
          level: logEvent.level,
          type: mapLogToEventType(logEvent),
          url: logEvent.details?.url,
          dataPoints: logEvent.details?.dataPoints,
        };

        setEvents((prev) => [...prev, scrapingEvent]);

        // Update stats from log details
        if (logEvent.details?.url) {
          setCurrentUrl(logEvent.details.url);
        }
        if (logEvent.details?.dataPoints) {
          setTotalDataPoints((prev) => prev + logEvent.details!.dataPoints);
        }
        if (logEvent.message.includes("Scraping")) {
          setPagesScraped((prev) => prev + 1);
        }

        // Check for completion
        if (logEvent.message.includes("complete") || logEvent.message.includes("Ready for conversation")) {
          setIsComplete(true);
          onComplete?.();
        }
      } catch (e) {
        console.error("Error parsing SSE event:", e);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      console.error("SSE connection error");
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [targetId, targetName, isComplete, onComplete]);

  // Also poll for status updates (backup)
  useEffect(() => {
    if (isComplete) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/status/${targetId}`);
        const data = await response.json();

        setPagesScraped(data.sourcesScraped || 0);
        setTotalDataPoints(data.dataPoints || 0);

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
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [targetId, isComplete, onComplete]);

  function mapLogToEventType(log: LogEvent): ScrapingEvent["type"] {
    if (log.level === "error") return "error";
    if (log.message.toLowerCase().includes("complete") || log.message.toLowerCase().includes("ready")) return "complete";
    if (log.message.toLowerCase().includes("extracted")) return "extracted";
    if (log.message.toLowerCase().includes("scraping") || log.message.toLowerCase().includes("scrape")) return "scraping";
    if (log.message.toLowerCase().includes("start")) return "start";
    return "info";
  }

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

  const getEventIcon = (type: ScrapingEvent["type"], level?: string) => {
    if (level === "error") {
      return <AlertCircle className="w-4 h-4 text-[var(--accent-danger)]" />;
    }
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
        return <AlertCircle className="w-4 h-4 text-[var(--accent-danger)]" />;
      case "info":
        return <Terminal className="w-4 h-4 text-[var(--text-muted)]" />;
      default:
        return <Terminal className="w-4 h-4 text-[var(--text-muted)]" />;
    }
  };

  const getEventColor = (type: ScrapingEvent["type"], level?: string) => {
    if (level === "error") return "text-[var(--accent-danger)]";
    if (level === "warn") return "text-[var(--accent-warning)]";
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
      case "info":
        return "text-[var(--text-secondary)]";
      default:
        return "text-[var(--text-secondary)]";
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <Terminal className="w-4 h-4" />
              <span>INTERVOX Intelligence Pipeline v1.0</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[var(--accent-success)]' : 'bg-[var(--accent-warning)]'}`} />
              <span className="text-xs text-[var(--text-muted)]">
                {isConnected ? 'Live' : 'Connecting...'}
              </span>
            </div>
          </div>

          <AnimatePresence>
            {events.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(index * 0.02, 0.5) }}
                className="flex items-start gap-2 py-1"
              >
                <span className="text-[var(--text-muted)] text-xs w-20 flex-shrink-0">
                  {event.timestamp instanceof Date
                    ? event.timestamp.toLocaleTimeString()
                    : new Date(event.timestamp).toLocaleTimeString()}
                </span>
                {getEventIcon(event.type, event.level)}
                <span className={getEventColor(event.type, event.level)}>
                  [{event.source.toUpperCase()}]
                </span>
                <span className="text-[var(--text-secondary)] flex-1">
                  {event.message}
                  {event.dataPoints && event.dataPoints > 0 && (
                    <span className="text-[var(--accent-success)]">
                      {" "}+{event.dataPoints} data points
                    </span>
                  )}
                  {event.url && (
                    <span className="text-[var(--text-muted)] text-xs ml-2 truncate max-w-md inline-block align-bottom">
                      {event.url}
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
