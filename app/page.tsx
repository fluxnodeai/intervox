"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Zap,
  MessageSquare,
  Globe,
  Phone,
  ArrowRight,
  Check,
  X,
  Loader2,
  ChevronRight,
} from "lucide-react";
import LiveScrapingView from "./components/LiveScrapingView";
import VoiceConversation from "./components/VoiceConversation";
import { InvestigationResult, IdentityCandidate } from "@/shared/types";

type AppState = "landing" | "confirming" | "scraping" | "ready" | "calling";

export default function Home() {
  const [appState, setAppState] = useState<AppState>("landing");
  const [targetName, setTargetName] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [investigation, setInvestigation] = useState<InvestigationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showContextInput, setShowContextInput] = useState(false);

  // Start investigation
  const handleInvestigate = async () => {
    if (!targetName.trim()) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetName: targetName.trim(),
          targetContext: additionalContext.trim() || undefined,
          depth: "deep",
        }),
      });

      const data = await response.json();
      setInvestigation(data);

      if (data.status === "confirming_identity" && data.identityCandidates?.length) {
        setAppState("confirming");
      } else if (data.status === "scraping") {
        setAppState("scraping");
      }
    } catch (error) {
      console.error("Investigation error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Confirm identity
  const handleConfirm = async (candidate: IdentityCandidate) => {
    if (!investigation) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetId: investigation.targetId,
          confirmed: true,
          selectedCandidateId: candidate.id,
        }),
      });

      const data = await response.json();
      setInvestigation(data);
      setAppState("scraping");
    } catch (error) {
      console.error("Confirm error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Reject and provide more context
  const handleReject = () => {
    setShowContextInput(true);
  };

  // Re-search with context
  const handleReSearch = async () => {
    if (!investigation || !additionalContext.trim()) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetId: investigation.targetId,
          confirmed: false,
          additionalContext: additionalContext.trim(),
        }),
      });

      const data = await response.json();
      setInvestigation(data);
      setShowContextInput(false);
    } catch (error) {
      console.error("Re-search error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Poll for status when scraping
  useEffect(() => {
    if (appState !== "scraping" || !investigation?.targetId) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/status/${investigation.targetId}`);
        const data = await response.json();
        setInvestigation(data);

        if (data.status === "ready") {
          setAppState("ready");
          clearInterval(interval);
        }
      } catch (error) {
        console.error("Poll error:", error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [appState, investigation?.targetId]);

  // Start call
  const handleStartCall = () => {
    setAppState("calling");
  };

  // End call
  const handleEndCall = () => {
    setAppState("ready");
  };

  // Reset
  const handleReset = () => {
    setAppState("landing");
    setTargetName("");
    setAdditionalContext("");
    setInvestigation(null);
    setShowContextInput(false);
  };

  return (
    <main className="min-h-screen bg-[#050508]">
      {/* Subtle grid background */}
      <div
        className="fixed inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                <Globe className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                INTERVOX
              </span>
            </div>

            {appState !== "landing" && (
              <button
                onClick={handleReset}
                className="text-sm text-white/40 hover:text-white/80 transition-colors"
              >
                New Search
              </button>
            )}
          </div>
        </header>

        <AnimatePresence mode="wait">
          {/* LANDING STATE */}
          {appState === "landing" && (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto px-6 pt-32 pb-20"
            >
              {/* Hero */}
              <div className="text-center mb-16">
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-6xl md:text-7xl font-bold text-white mb-4 tracking-tight"
                >
                  Find anyone.
                </motion.h1>
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-6xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-8"
                >
                  Anywhere.
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-xl text-white/50 max-w-xl mx-auto"
                >
                  We scrape the entire internet, build their digital twin, and let you talk to them.
                </motion.p>
              </div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex justify-center gap-12 mb-16 text-center"
              >
                <div>
                  <div className="text-3xl font-bold text-white">25B+</div>
                  <div className="text-sm text-white/40">Pages indexed</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">100+</div>
                  <div className="text-sm text-white/40">Sources per search</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">&lt;60s</div>
                  <div className="text-sm text-white/40">Time to persona</div>
                </div>
              </motion.div>

              {/* Search Input */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="max-w-2xl mx-auto"
              >
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity" />
                  <div className="relative bg-[#0a0a0f] border border-white/10 rounded-2xl p-2">
                    <div className="flex items-center">
                      <Search className="w-5 h-5 text-white/30 ml-4" />
                      <input
                        type="text"
                        value={targetName}
                        onChange={(e) => setTargetName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleInvestigate()}
                        placeholder="Enter a name..."
                        className="flex-1 bg-transparent px-4 py-4 text-lg text-white placeholder:text-white/30 focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={handleInvestigate}
                        disabled={!targetName.trim() || isLoading}
                        className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold rounded-xl disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center gap-2"
                      >
                        {isLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            Investigate
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-center text-white/30 text-sm mt-4">
                  Try: Elon Musk, Sam Altman, Jensen Huang, Satya Nadella
                </p>
              </motion.div>
            </motion.div>
          )}

          {/* CONFIRMING STATE */}
          {appState === "confirming" && investigation?.identityCandidates && (
            <motion.div
              key="confirming"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-2xl mx-auto px-6 py-20"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Confirm Identity
                </h2>
                <p className="text-white/50">
                  We found {investigation.identityCandidates.length} potential matches for &quot;{investigation.targetName}&quot;
                </p>
              </div>

              {!showContextInput ? (
                <div className="space-y-3">
                  {investigation.identityCandidates.map((candidate, i) => (
                    <motion.button
                      key={candidate.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      onClick={() => handleConfirm(candidate)}
                      disabled={isLoading}
                      className="w-full p-5 bg-[#0a0a0f] border border-white/10 rounded-xl hover:border-cyan-500/50 transition-colors text-left group disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors">
                              {candidate.name}
                            </h3>
                            <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full">
                              {candidate.confidence}% match
                            </span>
                          </div>
                          <p className="text-sm text-white/50 line-clamp-2">
                            {candidate.description}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-cyan-400 transition-colors" />
                      </div>
                    </motion.button>
                  ))}

                  <button
                    onClick={handleReject}
                    className="w-full py-4 text-white/40 hover:text-white/80 transition-colors flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    None of these - let me specify
                  </button>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <p className="text-white/50 text-center">
                    Provide more context to help identify the right person:
                  </p>
                  <textarea
                    value={additionalContext}
                    onChange={(e) => setAdditionalContext(e.target.value)}
                    placeholder="e.g., CEO of a specific company, professor at Stanford, author of..."
                    className="w-full p-4 bg-[#0a0a0f] border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 h-32 resize-none"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowContextInput(false)}
                      className="flex-1 py-3 border border-white/10 text-white/60 rounded-xl hover:bg-white/5 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleReSearch}
                      disabled={!additionalContext.trim() || isLoading}
                      className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold rounded-xl disabled:opacity-50"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                      ) : (
                        "Search Again"
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* SCRAPING STATE */}
          {appState === "scraping" && investigation && (
            <motion.div
              key="scraping"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-5xl mx-auto px-6 py-12"
            >
              <LiveScrapingView
                targetId={investigation.targetId}
                targetName={investigation.targetName}
                onComplete={() => setAppState("ready")}
              />
            </motion.div>
          )}

          {/* READY STATE */}
          {appState === "ready" && investigation?.persona && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-2xl mx-auto px-6 py-20 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center"
              >
                <Check className="w-12 h-12 text-white" />
              </motion.div>

              <h2 className="text-3xl font-bold text-white mb-4">
                {investigation.persona.identity.fullName} is ready
              </h2>

              <p className="text-white/50 mb-2">
                {investigation.persona.identity.currentRole}
                {investigation.persona.identity.company && ` at ${investigation.persona.identity.company}`}
              </p>

              <div className="flex justify-center gap-6 mb-10 text-sm">
                <div className="text-white/40">
                  <span className="text-cyan-400 font-bold">{investigation.sourcesScraped}</span> sources
                </div>
                <div className="text-white/40">
                  <span className="text-purple-400 font-bold">{investigation.dataPoints}</span> data points
                </div>
                <div className="text-white/40">
                  <span className="text-green-400 font-bold">{investigation.persona.speech.exampleQuotes.length}</span> quotes
                </div>
              </div>

              <button
                onClick={handleStartCall}
                className="px-10 py-5 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xl font-bold rounded-2xl hover:opacity-90 transition-opacity flex items-center gap-3 mx-auto shadow-lg shadow-green-500/25"
              >
                <Phone className="w-6 h-6" />
                Call {investigation.persona.identity.fullName.split(" ")[0]}
              </button>

              <p className="text-white/30 text-sm mt-4">
                Voice powered by ElevenLabs • Personality by Grok
              </p>
            </motion.div>
          )}

          {/* CALLING STATE */}
          {appState === "calling" && investigation?.persona && (
            <motion.div
              key="calling"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-6 py-12"
            >
              <VoiceConversation
                persona={investigation.persona}
                onEnd={handleEndCall}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
