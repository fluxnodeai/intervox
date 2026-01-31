"use client";

import { motion } from "framer-motion";
import { Check, X, User, HelpCircle } from "lucide-react";
import { IdentityCandidate } from "@/shared/types";

interface IdentityConfirmationProps {
  candidates: IdentityCandidate[];
  onConfirm: (candidateId: string) => void;
  onReject: () => void;
  targetName: string;
}

export default function IdentityConfirmation({
  candidates,
  onConfirm,
  onReject,
  targetName,
}: IdentityConfirmationProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-[var(--accent-primary)]/20 flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-[var(--accent-primary)]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              Confirm Identity
            </h3>
            <p className="text-sm text-[var(--text-muted)]">
              We found {candidates.length} potential match
              {candidates.length !== 1 ? "es" : ""} for &quot;{targetName}&quot;
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {candidates.map((candidate, index) => (
            <motion.button
              key={candidate.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onConfirm(candidate.id)}
              className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg hover:border-[var(--accent-primary)] transition-colors text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center flex-shrink-0">
                  {candidate.thumbnail ? (
                    <img
                      src={candidate.thumbnail}
                      alt={candidate.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-[var(--text-muted)]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                      {candidate.name}
                    </h4>
                    <span className="text-xs px-2 py-0.5 bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] rounded-full">
                      {candidate.confidence}% match
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">
                    {candidate.description}
                  </p>
                  {candidate.sources.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {candidate.sources.slice(0, 3).map((source, i) => (
                        <span
                          key={i}
                          className="text-xs text-[var(--text-muted)]"
                        >
                          {new URL(source).hostname}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <Check className="w-5 h-5 text-[var(--accent-success)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </div>
            </motion.button>
          ))}
        </div>

        <button
          onClick={onReject}
          className="w-full mt-4 py-3 text-[var(--text-muted)] hover:text-[var(--accent-danger)] transition-colors flex items-center justify-center gap-2"
        >
          <X className="w-4 h-4" />
          None of these - try a different search
        </button>
      </div>
    </motion.div>
  );
}
