"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  Check,
  X,
  Loader2,
  ChevronRight,
} from "lucide-react";
import LiveScrapingView from "./components/LiveScrapingView";
import VoiceConversation from "./components/VoiceConversation";
import IconifyIcon from "./components/IconifyIcon";
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
    <>
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-8">
                <a href="#" onClick={handleReset} className="text-white font-medium tracking-tight text-lg flex items-center gap-2">
                    <img 
                        src="/logo/intervox-logo.png" 
                        alt="INTERVOX" 
                        className="h-6 w-auto opacity-90 hover:opacity-100 transition-opacity"
                    />
                </a>
                <div className="hidden md:flex items-center gap-6 text-sm">
                    <a href="#" className="text-slate-300 hover:text-white transition-colors duration-200">Archives</a>
                    <a href="#" className="hover:text-white transition-colors duration-200">Nodes</a>
                    <a href="#" className="hover:text-white transition-colors duration-200">Stream</a>
                    <a href="#" className="hover:text-white transition-colors duration-200">Protocol</a>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2 px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-slate-500">
                    <span className="text-xs">⌘K</span>
                </div>
                <a href="#" className="text-sm text-slate-300 hover:text-white flex items-center gap-2 transition-colors">
                    <IconifyIcon icon="solar:code-circle-linear" className="text-lg" />
                    <span>Contribute</span>
                </a>
            </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center pt-32 px-4 relative min-h-screen">
        
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-teal-500/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

        <AnimatePresence mode="wait">
          {appState === "landing" ? (
            <div className="w-full flex flex-col items-center">
              {/* Hero Section */}
              <div className="relative z-10 w-full max-w-3xl flex flex-col items-center text-center space-y-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-teal-500/20 bg-teal-500/5 text-teal-400 text-xs font-medium tracking-wide">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                      </span>
                      PUBLIC PROTOCOL V2.4 LIVE
                  </div>

                  <h1 className="text-5xl sm:text-6xl font-medium text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-slate-500 tracking-tighter leading-tight">
                      The open record of<br /> human intelligence.
                  </h1>
                  
                  <p className="text-lg text-slate-400 max-w-xl font-light leading-relaxed">
                      Intervox is a decentralized, public-facing knowledge graph. No paywalls, no gatekeepers. Just raw, verified data accessible to everyone.
                  </p>

                  {/* Search Interface */}
                  <div className="w-full mt-8 group">
                      <div className="relative flex items-center w-full p-1 bg-white/[0.03] border border-white/10 rounded-xl shadow-2xl shadow-black/50 transition-all duration-300 focus-within:border-teal-500/50 focus-within:ring-1 focus-within:ring-teal-500/20 hover:border-white/20">
                          <div className="pl-4 text-slate-500">
                              <IconifyIcon icon="solar:magnifer-linear" width={24} height={24} />
                          </div>
                          <input 
                            type="text" 
                            placeholder="Search the archives (e.g., organizations, events, hashes)..." 
                            className="w-full bg-transparent border-none text-white placeholder-slate-600 focus:ring-0 h-12 px-4 text-base font-light outline-none"
                            value={targetName}
                            onChange={(e) => setTargetName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleInvestigate()}
                          />
                          <div className="flex items-center gap-2 pr-1">
                              <button className="p-2 text-slate-400 hover:text-white transition-colors">
                                  <IconifyIcon icon="solar:filter-linear" width={20} height={20} />
                              </button>
                              <button 
                                onClick={handleInvestigate}
                                disabled={isLoading || !targetName.trim()}
                                className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors flex items-center gap-2 disabled:opacity-50"
                              >
                                  {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <span>Query</span>
                                      <IconifyIcon icon="solar:arrow-right-linear" width={16} height={16} />
                                    </>
                                  )}
                              </button>
                          </div>
                      </div>

                      {/* Filters */}
                      <div className="flex flex-wrap items-center justify-center gap-6 mt-6 text-sm">
                          <label className="flex items-center cursor-pointer gap-2 group/toggle">
                              <div className="relative">
                                  <input type="checkbox" className="sr-only peer toggle-checkbox" />
                                  <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600 peer-checked:after:bg-white toggle-label"></div>
                              </div>
                              <span className="text-slate-400 group-hover/toggle:text-slate-200 transition-colors">Verified Only</span>
                          </label>

                          <label className="flex items-center cursor-pointer gap-2 group/toggle">
                              <div className="relative">
                                  <input type="checkbox" className="sr-only peer toggle-checkbox" defaultChecked />
                                  <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600 peer-checked:after:bg-white toggle-label"></div>
                              </div>
                              <span className="text-slate-400 group-hover/toggle:text-slate-200 transition-colors">Public Domain</span>
                          </label>
                      </div>
                  </div>
              </div>

              {/* Section 2: Recent Activity / Live Stream */}
              <div className="w-full max-w-7xl mt-32 grid grid-cols-1 md:grid-cols-12 gap-6">
                  
                  {/* Live Feed Column */}
                  <div className="md:col-span-4 flex flex-col gap-4">
                      <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xs uppercase tracking-widest font-medium text-slate-500">Global Stream</h3>
                          <div className="flex gap-2 items-center text-xs text-slate-600 font-mono">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                              LIVE
                          </div>
                      </div>
                      
                      {/* Feed Item 1 */}
                      <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4 hover:border-white/10 transition-colors cursor-pointer group">
                          <div className="flex items-start justify-between">
                              <div className="flex gap-3">
                                  <div className="w-8 h-8 rounded bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20">
                                      <IconifyIcon icon="solar:folder-with-files-linear" width={18} />
                                  </div>
                                  <div>
                                      <p className="text-sm text-slate-200 font-medium group-hover:text-teal-400 transition-colors">Project_Titan_Leaks</p>
                                      <p className="text-xs text-slate-500">241 files added • 12s ago</p>
                                  </div>
                              </div>
                              <IconifyIcon icon="solar:arrow-right-up-linear" className="text-slate-600 group-hover:text-white transition-colors" />
                          </div>
                      </div>

                      {/* Feed Item 2 */}
                      <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4 hover:border-white/10 transition-colors cursor-pointer group">
                          <div className="flex items-start justify-between">
                              <div className="flex gap-3">
                                  <div className="w-8 h-8 rounded bg-slate-800 text-slate-400 flex items-center justify-center border border-white/10">
                                      <IconifyIcon icon="solar:user-linear" width={18} />
                                  </div>
                                  <div>
                                      <p className="text-sm text-slate-200 font-medium group-hover:text-white transition-colors">Anonymous Contributor</p>
                                      <p className="text-xs text-slate-500">Edited "Maritime Logistics" • 45s ago</p>
                                  </div>
                              </div>
                          </div>
                      </div>

                       {/* Feed Item 3 */}
                       <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4 hover:border-white/10 transition-colors cursor-pointer group">
                          <div className="flex items-start justify-between">
                              <div className="flex gap-3">
                                  <div className="w-8 h-8 rounded bg-orange-500/10 text-orange-400 flex items-center justify-center border border-orange-500/20">
                                      <IconifyIcon icon="solar:shield-warning-linear" width={18} />
                                  </div>
                                  <div>
                                      <p className="text-sm text-slate-200 font-medium group-hover:text-orange-400 transition-colors">CVE-2023-481</p>
                                      <p className="text-xs text-slate-500">Vulnerability Patch • 2m ago</p>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Visualization Column */}
                  <div className="md:col-span-8 h-[450px] md:h-auto bg-white/[0.02] border border-white/5 rounded-xl relative overflow-hidden flex flex-col">
                      <div className="p-4 border-b border-white/5 flex justify-between items-center z-10 bg-[#050505]/50 backdrop-blur-sm">
                          <div className="flex items-center gap-3">
                              <h3 className="text-xs uppercase tracking-widest font-medium text-slate-500">Network Topology</h3>
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-teal-500/10 text-teal-500 border border-teal-500/20">PUBLIC ACCESS</span>
                          </div>
                          <div className="flex gap-4 text-xs font-mono text-slate-500">
                              <span>NODES: 14.2M</span>
                              <span>EDGES: 891M</span>
                          </div>
                      </div>
                      
                      {/* Graph Visualization */}
                      <div className="flex-grow relative w-full h-full flex items-center justify-center opacity-70">
                           {/* Central Node */}
                           <div className="absolute w-16 h-16 rounded-full border border-teal-500/40 bg-teal-900/10 flex items-center justify-center z-20 shadow-[0_0_30px_rgba(20,184,166,0.15)]">
                              <div className="w-3 h-3 bg-teal-400 rounded-full shadow-[0_0_10px_rgba(20,184,166,0.8)]"></div>
                           </div>

                           {/* Orbit 1 */}
                           <div className="absolute w-[220px] h-[220px] border border-white/5 rounded-full animate-pulse-slow"></div>
                           
                           {/* Orbit 2 */}
                           <div className="absolute w-[400px] h-[400px] border border-white/5 rounded-full border-dashed opacity-50"></div>
                           
                           {/* Satellite Nodes */}
                           <div className="absolute top-1/2 left-1/2 translate-x-32 -translate-y-24 w-10 h-10 bg-[#050505] border border-white/10 rounded-full flex items-center justify-center z-10 hover:border-teal-500/50 transition-colors cursor-pointer group">
                               <IconifyIcon icon="solar:server-square-linear" className="text-slate-500 text-sm group-hover:text-teal-400" />
                           </div>

                           <div className="absolute top-1/2 left-1/2 -translate-x-36 translate-y-12 w-10 h-10 bg-[#050505] border border-white/10 rounded-full flex items-center justify-center z-10 hover:border-teal-500/50 transition-colors cursor-pointer group">
                              <IconifyIcon icon="solar:global-linear" className="text-slate-500 text-sm group-hover:text-teal-400" />
                          </div>

                          <div className="absolute top-1/2 left-1/2 translate-x-12 translate-y-36 w-8 h-8 bg-[#050505] border border-white/10 rounded-full flex items-center justify-center z-10 hover:border-teal-500/50 transition-colors cursor-pointer group">
                              <IconifyIcon icon="solar:document-text-linear" className="text-slate-500 text-xs group-hover:text-teal-400" />
                          </div>

                          {/* Connecting Lines */}
                          <div className="absolute w-[150px] h-[1px] bg-gradient-to-r from-transparent via-teal-500/20 to-transparent rotate-[35deg] origin-left left-1/2 top-1/2"></div>
                          <div className="absolute w-[150px] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent rotate-[145deg] origin-left left-1/2 top-1/2"></div>
                      </div>
                  </div>
              </div>

              {/* Section 3: Trending Archives Grid */}
              <div className="w-full max-w-7xl mt-24 mb-12">
                  <div className="flex items-end justify-between mb-8">
                      <div>
                          <h2 className="text-2xl text-white font-medium tracking-tight mb-2">Trending Archives</h2>
                          <p className="text-slate-500 text-sm">Most accessed public datasets this week.</p>
                      </div>
                      <a href="#" className="text-sm text-teal-500 hover:text-teal-400 flex items-center gap-1 transition-colors">
                          View full directory <IconifyIcon icon="solar:arrow-right-linear" />
                      </a>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Archive Card 1 */}
                      <a href="#" className="group block p-6 rounded-xl border border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300">
                          <div className="flex justify-between items-start mb-4">
                              <div className="w-10 h-10 rounded-lg bg-black border border-white/10 flex items-center justify-center text-slate-300 group-hover:text-white transition-colors">
                                  <IconifyIcon icon="solar:buildings-linear" width={20} />
                              </div>
                              <span className="text-[10px] uppercase tracking-wider text-slate-500 border border-white/5 px-2 py-1 rounded bg-black">Corporate</span>
                          </div>
                          <h3 className="text-lg font-medium text-white mb-2 tracking-tight">Offshore Registries</h3>
                          <p className="text-sm text-slate-500 leading-relaxed mb-4 group-hover:text-slate-400">
                              Consolidated filings from Panama, BVI, and Seychelles. Updated with 2024 leaked datasets.
                          </p>
                          <div className="flex items-center gap-4 text-xs text-slate-600 font-mono">
                              <span>4.2TB DATA</span>
                              <span>•</span>
                              <span>12M RECORDS</span>
                          </div>
                      </a>

                      {/* Archive Card 2 */}
                      <a href="#" className="group block p-6 rounded-xl border border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300">
                          <div className="flex justify-between items-start mb-4">
                              <div className="w-10 h-10 rounded-lg bg-black border border-white/10 flex items-center justify-center text-slate-300 group-hover:text-white transition-colors">
                                  <IconifyIcon icon="solar:monitor-camera-linear" width={20} />
                              </div>
                              <span className="text-[10px] uppercase tracking-wider text-slate-500 border border-white/5 px-2 py-1 rounded bg-black">IOT</span>
                          </div>
                          <h3 className="text-lg font-medium text-white mb-2 tracking-tight">Public Net Cams</h3>
                          <p className="text-sm text-slate-500 leading-relaxed mb-4 group-hover:text-slate-400">
                              Index of unsecured IP cameras and IoT devices. Geolocation data included.
                          </p>
                          <div className="flex items-center gap-4 text-xs text-slate-600 font-mono">
                              <span>LIVE FEED</span>
                              <span>•</span>
                              <span>890K DEVICES</span>
                          </div>
                      </a>

                      {/* Archive Card 3 */}
                      <a href="#" className="group block p-6 rounded-xl border border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300">
                          <div className="flex justify-between items-start mb-4">
                              <div className="w-10 h-10 rounded-lg bg-black border border-white/10 flex items-center justify-center text-slate-300 group-hover:text-white transition-colors">
                                  <IconifyIcon icon="solar:wallet-linear" width={20} />
                              </div>
                              <span className="text-[10px] uppercase tracking-wider text-slate-500 border border-white/5 px-2 py-1 rounded bg-black">Crypto</span>
                          </div>
                          <h3 className="text-lg font-medium text-white mb-2 tracking-tight">Darknet TX Graph</h3>
                          <p className="text-sm text-slate-500 leading-relaxed mb-4 group-hover:text-slate-400">
                              Mapped cryptocurrency wallet relationships linked to known marketplace addresses.
                          </p>
                          <div className="flex items-center gap-4 text-xs text-slate-600 font-mono">
                              <span>BTC/XMR</span>
                              <span>•</span>
                              <span>DAILY UPDATE</span>
                          </div>
                      </a>
                  </div>
              </div>

              {/* Section 4: Mission / Info */}
              <div className="w-full max-w-7xl mb-24 grid grid-cols-1 lg:grid-cols-2 gap-12 border-t border-white/5 pt-20">
                  <div className="pr-8">
                      <h2 className="text-3xl text-white font-medium tracking-tighter mb-6">Democratizing access to information.</h2>
                      <div className="space-y-6 text-slate-400 text-sm leading-7 font-light">
                          <p>
                              Information wants to be free. Intervox is built on the belief that public data should be accessible, searchable, and verifiable by anyone, anywhere.
                          </p>
                          <p>
                              Unlike traditional intelligence platforms that hide behind expensive licenses, Intervox operates on a contribution model. Researchers, journalists, and citizens contribute data, and the community verifies it.
                          </p>
                          <div className="pt-4 flex items-center gap-4">
                              <button className="text-white border-b border-white pb-0.5 hover:text-teal-400 hover:border-teal-400 transition-colors">Read the Whitepaper</button>
                              <button className="text-white border-b border-white pb-0.5 hover:text-teal-400 hover:border-teal-400 transition-colors">View Source Code</button>
                          </div>
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="p-6 bg-[#0A0A0A] rounded-lg border border-white/5 flex flex-col justify-center">
                          <div className="text-3xl font-semibold text-white mb-1 tracking-tight">100%</div>
                          <div className="text-xs text-slate-500 uppercase tracking-wide">Open Source</div>
                      </div>
                      <div className="p-6 bg-[#0A0A0A] rounded-lg border border-white/5 flex flex-col justify-center">
                          <div className="text-3xl font-semibold text-white mb-1 tracking-tight">0</div>
                          <div className="text-xs text-slate-500 uppercase tracking-wide">Trackers</div>
                      </div>
                      <div className="p-6 bg-[#0A0A0A] rounded-lg border border-white/5 flex flex-col justify-center col-span-2">
                          <div className="flex items-center gap-2 mb-2">
                              <IconifyIcon icon="solar:lock-unlocked-linear" className="text-teal-500" />
                              <span className="text-sm text-slate-200">Permissionless API</span>
                          </div>
                          <div className="text-xs text-slate-500 leading-5">
                              Build your own tools on top of the Intervox protocol. No API keys required for read-only access.
                          </div>
                      </div>
                  </div>
              </div>
            </div>
          ) : (
            // Active Investigation State
            <motion.div
              key="active"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-5xl mx-auto z-10"
            >
              {appState === "confirming" && investigation?.identityCandidates && (
                <div className="max-w-2xl mx-auto py-10">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-white mb-2">
                      Confirm Identity
                    </h2>
                    <p className="text-white/50">
                      We found {investigation.identityCandidates.length} potential matches for "{investigation.targetName}"
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
                          className="w-full p-5 bg-[#0a0a0f] border border-white/10 rounded-xl hover:border-teal-500/50 transition-colors text-left group disabled:opacity-50"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="font-semibold text-white group-hover:text-teal-400 transition-colors">
                                  {candidate.name}
                                </h3>
                                <span className="text-xs px-2 py-0.5 bg-teal-500/20 text-teal-400 rounded-full">
                                  {candidate.confidence}% match
                                </span>
                              </div>
                              <p className="text-sm text-white/50 line-clamp-2">
                                {candidate.description}
                              </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-teal-400 transition-colors" />
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
                        className="w-full p-4 bg-[#0a0a0f] border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-teal-500/50 h-32 resize-none"
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
                          className="flex-1 py-3 bg-teal-600 text-white font-semibold rounded-xl disabled:opacity-50 hover:bg-teal-500 transition-colors"
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
                </div>
              )}

              {appState === "scraping" && investigation && (
                <LiveScrapingView
                  targetId={investigation.targetId}
                  targetName={investigation.targetName}
                  onComplete={() => setAppState("ready")}
                />
              )}

              {appState === "ready" && investigation?.persona && (
                <div className="max-w-2xl mx-auto py-10 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.2 }}
                    className="w-24 h-24 mx-auto mb-8 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center"
                  >
                    <Check className="w-12 h-12 text-teal-400" />
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
                      <span className="text-teal-400 font-bold">{investigation.sourcesScraped}</span> sources
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
                    className="px-10 py-5 bg-teal-600 text-white text-xl font-bold rounded-2xl hover:bg-teal-500 transition-all flex items-center gap-3 mx-auto shadow-lg shadow-teal-500/25"
                  >
                    <Phone className="w-6 h-6" />
                    Call {investigation.persona.identity.fullName.split(" ")[0]}
                  </button>

                  <p className="text-white/30 text-sm mt-4">
                    Voice powered by ElevenLabs • Personality by Grok
                  </p>
                </div>
              )}

              {appState === "calling" && investigation?.persona && (
                 <VoiceConversation
                   persona={investigation.persona}
                   onEnd={handleEndCall}
                 />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-black py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-white rounded-sm flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                </div>
                <span className="text-sm font-medium text-white tracking-tight">INTERVOX</span>
            </div>
            <div className="flex gap-8 text-xs text-slate-500">
                <a href="#" className="hover:text-slate-300 transition-colors">Manifesto</a>
                <a href="#" className="hover:text-slate-300 transition-colors">Community Guidelines</a>
                <a href="#" className="hover:text-slate-300 transition-colors">Tor Onion Address</a>
                <a href="#" className="hover:text-slate-300 transition-colors flex items-center gap-1">
                    <IconifyIcon icon="solar:github-linear" /> GitHub
                </a>
            </div>
            <div className="text-xs text-slate-600">
                Copyleft 2024 Intervox Foundation.
            </div>
        </div>
      </footer>
    </>
  );
}
