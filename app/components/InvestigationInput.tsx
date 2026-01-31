"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Zap, User, Loader2 } from "lucide-react";

interface InvestigationInputProps {
  onSubmit: (name: string, context?: string) => void;
  isLoading: boolean;
}

export default function InvestigationInput({
  onSubmit,
  isLoading,
}: InvestigationInputProps) {
  const [targetName, setTargetName] = useState("");
  const [context, setContext] = useState("");
  const [showContext, setShowContext] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetName.trim()) {
      onSubmit(targetName.trim(), context.trim() || undefined);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Main Input */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-xl blur-sm opacity-30" />
          <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden">
            <div className="flex items-center px-4 py-4">
              <User className="w-5 h-5 text-[var(--accent-primary)] mr-3" />
              <input
                type="text"
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                placeholder="Enter a name to investigate..."
                className="flex-1 bg-transparent text-[var(--text-primary)] text-lg placeholder:text-[var(--text-muted)] focus:outline-none"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!targetName.trim() || isLoading}
                className="ml-3 px-6 py-2 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Investigate
                  </>
                )}
              </button>
            </div>

            {/* Context Toggle */}
            {!showContext && (
              <button
                type="button"
                onClick={() => setShowContext(true)}
                className="w-full px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] border-t border-[var(--border-color)] transition-colors text-left"
              >
                + Add context to help identify the right person
              </button>
            )}

            {/* Context Input */}
            {showContext && (
              <div className="px-4 py-3 border-t border-[var(--border-color)]">
                <input
                  type="text"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="e.g., CEO of Tesla, Stanford professor, author of..."
                  className="w-full bg-transparent text-[var(--text-secondary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none"
                  disabled={isLoading}
                />
              </div>
            )}
          </div>
        </div>

        {/* Helper Text */}
        <p className="text-center text-sm text-[var(--text-muted)]">
          We&apos;ll scrape public information and build a persona you can talk to
        </p>
      </form>
    </motion.div>
  );
}
