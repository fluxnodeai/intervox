"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Globe, MessageSquare } from "lucide-react";
import InvestigationInput from "./components/InvestigationInput";
import IdentityConfirmation from "./components/IdentityConfirmation";
import InvestigationProgress from "./components/InvestigationProgress";
import VoiceConversation from "./components/VoiceConversation";
import { InvestigationResult } from "@/shared/types";

type AppState =
  | "idle"
  | "confirming"
  | "investigating"
  | "ready"
  | "conversation";

export default function Home() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [investigation, setInvestigation] = useState<InvestigationResult | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll for investigation status
  useEffect(() => {
    if (!investigation?.targetId) return;
    if (investigation.status === "ready" || investigation.status === "error")
      return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/status/${investigation.targetId}`);
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        setInvestigation(data);

        if (data.status === "ready") {
          setAppState("ready");
          clearInterval(pollInterval);
        } else if (data.status === "error") {
          setError(data.error || "Investigation failed");
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [investigation?.targetId, investigation?.status]);

  // Start investigation
  const handleInvestigate = async (name: string, context?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetName: name,
          targetContext: context,
          depth: "standard",
          quickMode: false,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setInvestigation(data);

      if (data.status === "confirming_identity" && data.identityCandidates) {
        setAppState("confirming");
      } else {
        setAppState("investigating");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start investigation");
    } finally {
      setIsLoading(false);
    }
  };

  // Confirm identity
  const handleConfirmIdentity = async (candidateId: string) => {
    if (!investigation) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetId: investigation.targetId,
          confirmed: true,
          selectedCandidateId: candidateId,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setInvestigation(data);
      setAppState("investigating");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to confirm identity");
    } finally {
      setIsLoading(false);
    }
  };

  // Reject identity - go back to search
  const handleRejectIdentity = () => {
    setInvestigation(null);
    setAppState("idle");
  };

  // Start conversation
  const handleStartConversation = () => {
    setAppState("conversation");
  };

  // End conversation
  const handleEndConversation = () => {
    setAppState("ready");
  };

  // Reset everything
  const handleReset = () => {
    setInvestigation(null);
    setAppState("idle");
    setError(null);
  };

  return (
    <main className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">
                INTERVOX
              </h1>
              <p className="text-xs text-[var(--text-muted)]">
                Talk to Anyone
              </p>
            </div>
          </div>

          {appState !== "idle" && (
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              New Investigation
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {/* Idle State - Show Input */}
          {appState === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-12"
            >
              {/* Hero */}
              <div className="text-center space-y-4">
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-4xl md:text-5xl font-bold text-[var(--text-primary)]"
                >
                  Talk to{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]">
                    Anyone
                  </span>
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto"
                >
                  Enter a name. We scrape everything public about them. You get
                  a voice conversation with their digital twin.
                </motion.p>
              </div>

              {/* Input */}
              <InvestigationInput
                onSubmit={handleInvestigate}
                isLoading={isLoading}
              />

              {/* Features */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto"
              >
                <div className="p-6 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl">
                  <Globe className="w-8 h-8 text-[var(--accent-primary)] mb-4" />
                  <h3 className="font-semibold text-[var(--text-primary)] mb-2">
                    Comprehensive Scraping
                  </h3>
                  <p className="text-sm text-[var(--text-muted)]">
                    LinkedIn, Twitter, Wikipedia, news, YouTube, podcasts, and
                    more.
                  </p>
                </div>
                <div className="p-6 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl">
                  <Zap className="w-8 h-8 text-[var(--accent-secondary)] mb-4" />
                  <h3 className="font-semibold text-[var(--text-primary)] mb-2">
                    AI Persona Building
                  </h3>
                  <p className="text-sm text-[var(--text-muted)]">
                    We synthesize personality, opinions, and speaking style from
                    real data.
                  </p>
                </div>
                <div className="p-6 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl">
                  <MessageSquare className="w-8 h-8 text-[var(--accent-success)] mb-4" />
                  <h3 className="font-semibold text-[var(--text-primary)] mb-2">
                    Voice Conversation
                  </h3>
                  <p className="text-sm text-[var(--text-muted)]">
                    Natural voice chat powered by ElevenLabs and Grok.
                  </p>
                </div>
              </motion.div>

              {/* Error Display */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-2xl mx-auto p-4 bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/30 rounded-xl text-center"
                >
                  <p className="text-[var(--accent-danger)]">{error}</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Confirming Identity */}
          {appState === "confirming" && investigation?.identityCandidates && (
            <motion.div
              key="confirming"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <IdentityConfirmation
                candidates={investigation.identityCandidates}
                onConfirm={handleConfirmIdentity}
                onReject={handleRejectIdentity}
                targetName={investigation.targetName}
              />
            </motion.div>
          )}

          {/* Investigation in Progress */}
          {appState === "investigating" && investigation && (
            <motion.div
              key="investigating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <InvestigationProgress investigation={investigation} />
            </motion.div>
          )}

          {/* Ready - Show Start Conversation */}
          {appState === "ready" && investigation?.persona && (
            <motion.div
              key="ready"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <InvestigationProgress investigation={investigation} />

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <button
                  onClick={handleStartConversation}
                  className="px-8 py-4 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white text-lg font-semibold rounded-xl hover:opacity-90 transition-opacity glow-cyan"
                >
                  <MessageSquare className="w-5 h-5 inline-block mr-2" />
                  Start Voice Conversation
                </button>
              </motion.div>
            </motion.div>
          )}

          {/* Conversation */}
          {appState === "conversation" && investigation?.persona && (
            <motion.div
              key="conversation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <VoiceConversation
                persona={investigation.persona}
                onEnd={handleEndConversation}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
