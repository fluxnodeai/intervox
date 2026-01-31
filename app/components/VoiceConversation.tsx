"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Loader2,
  User,
  Bot,
} from "lucide-react";
import { PersonaModel, ConversationMessage } from "@/shared/types";

interface VoiceConversationProps {
  persona: PersonaModel;
  onEnd: () => void;
}

export default function VoiceConversation({
  persona,
  onEnd,
}: VoiceConversationProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message to persona
  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    setIsLoading(true);
    setInputText("");

    // Add user message immediately
    const userMessage: ConversationMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetId: persona.targetId,
          sessionId,
          message: text,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Update session ID if new
      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
      }

      // Add assistant message
      setMessages((prev) => [...prev, data.response]);

      // Play audio if enabled
      if (audioEnabled) {
        await playAudio(data.response.content);
      }
    } catch (error) {
      console.error("Chat error:", error);
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "Sorry, I had trouble responding. Please try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Play audio from TTS
  const playAudio = async (text: string) => {
    try {
      setIsSpeaking(true);

      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error("TTS failed");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        await audioRef.current.play();
      }
    } catch (error) {
      console.error("Audio playback error:", error);
    } finally {
      setIsSpeaking(false);
    }
  };

  // Handle voice input (Web Speech API)
  const toggleVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Voice input not supported in this browser");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      sendMessage(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.start();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputText);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full max-w-4xl mx-auto h-[80vh] flex flex-col"
    >
      {/* Header */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-t-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center">
            {persona.identity.profileImageUrl ? (
              <img
                src={persona.identity.profileImageUrl}
                alt={persona.identity.fullName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="w-6 h-6 text-white" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-[var(--text-primary)]">
              {persona.identity.fullName}
            </h3>
            <p className="text-sm text-[var(--text-muted)]">
              {persona.identity.currentRole}
              {persona.identity.company && ` at ${persona.identity.company}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-2 rounded-lg transition-colors ${
              audioEnabled
                ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]"
                : "bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
            }`}
          >
            {audioEnabled ? (
              <Volume2 className="w-5 h-5" />
            ) : (
              <VolumeX className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={onEnd}
            className="px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--accent-danger)]/20 hover:text-[var(--accent-danger)] transition-colors"
          >
            End
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 bg-[var(--bg-primary)] border-x border-[var(--border-color)] overflow-y-auto p-4 space-y-4">
        {/* Welcome message */}
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              You&apos;re now talking to {persona.identity.fullName}
            </h4>
            <p className="text-[var(--text-muted)] max-w-md mx-auto">
              This persona was built from {persona.dataPointsUsed} data points
              scraped from public sources. Ask anything!
            </p>
          </motion.div>
        )}

        {/* Message history */}
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] p-4 rounded-2xl ${
                  message.role === "user"
                    ? "bg-[var(--accent-primary)] text-white rounded-br-md"
                    : "bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-bl-md"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl rounded-bl-md p-4">
              <div className="flex items-center gap-2 text-[var(--text-muted)]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Thinking...</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Speaking indicator */}
        {isSpeaking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center"
          >
            <div className="flex items-center gap-2 text-[var(--accent-primary)] text-sm">
              <Volume2 className="w-4 h-4 animate-pulse" />
              Speaking...
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-b-xl p-4"
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleVoiceInput}
            className={`p-3 rounded-full transition-all ${
              isListening
                ? "bg-[var(--accent-danger)] text-white animate-pulse"
                : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)]"
            }`}
          >
            {isListening ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isListening ? "Listening..." : "Type or speak your message..."
            }
            disabled={isLoading || isListening}
            className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="p-3 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onEnded={() => setIsSpeaking(false)}
        className="hidden"
      />
    </motion.div>
  );
}
