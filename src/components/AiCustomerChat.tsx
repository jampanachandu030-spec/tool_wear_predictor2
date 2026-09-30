import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Gauge,
  HelpCircle,
  Key,
  Maximize2,
  Minimize2,
  Radio,
  Send,
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { useAi, MachineInputs } from "../context/AiContext";
import { generateAiResponse, AiMessage, MATERIALS_DATABASE } from "../lib/aiCustomerEngine";
import { toast } from "sonner";

export function AiCustomerChat() {
  const {
    telemetry,
    applyRecommendedParameters,
    isAiOpen,
    setIsAiOpen,
    pendingPrompt,
    clearPendingPrompt,
    setPilotModalOpen,
    activeMaterial,
    setActiveMaterial,
  } = useAi();

  const [messages, setMessages] = useState<AiMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `👋 **Welcome to EdgeWear AI Machining Copilot.**\n\nI am synchronized with **Spindle 04** live telemetry. I can diagnose your cutting parameters, optimize tool life (+30% RUL), calculate machine shop ROI, or verify CNC controller compatibility (Fanuc, Haas, Siemens, Heidenhain).\n\nHow can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      actions: [
        { type: "apply_parameters", label: "⚡ Diagnose Current Tool Telemetry" },
        { type: "open_pilot_modal", label: "🏭 Request Shop Floor Pilot Kit" },
      ],
    },
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("edgewear_gemini_key") || "";
    }
    return "";
  });
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Handle pending prompt passed from other parts of the app
  useEffect(() => {
    if (pendingPrompt && isAiOpen) {
      handleSendMessage(pendingPrompt);
      clearPendingPrompt();
    }
  }, [pendingPrompt, isAiOpen]);

  // Speech synthesis helper
  const speakText = (text: string) => {
    if (!voiceEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    // Strip markdown symbols for voice
    const clean = text
      .replace(/[#*`_~]/g, "")
      .replace(/\|.*\|/g, "")
      .substring(0, 300);
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMsg: AiMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await generateAiResponse(query, telemetry, activeMaterial, apiKey);

      const aiMsg: AiMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: response.text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actions: response.actions,
        telemetrySnapshot: {
          inputs: { ...telemetry.inputs },
          result: { ...telemetry.result },
        },
      };

      setMessages((prev) => [...prev, aiMsg]);
      speakText(response.text);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate response. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action: { type: string; label: string; data?: any }) => {
    if (action.type === "apply_parameters") {
      const params: MachineInputs = action.data || {
        spindleSpeed: 5200,
        feedRate: 0.22,
        depthOfCut: 1.2,
        vibration: 1.8,
        cuttingTime: telemetry.inputs.cuttingTime,
      };
      applyRecommendedParameters(params);
      toast.success("Applied AI optimized parameters to Live Predictor!", {
        description: `Spindle: ${params.spindleSpeed} RPM · Feed: ${params.feedRate} mm/rev`,
      });
    } else if (action.type === "open_pilot_modal") {
      setPilotModalOpen(true);
    } else if (action.type === "view_roi") {
      handleSendMessage("Calculate 10-machine shop ROI and savings");
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.info("Copied response to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveApiKey = () => {
    setApiKey(tempApiKey);
    if (typeof window !== "undefined") {
      localStorage.setItem("edgewear_gemini_key", tempApiKey.trim());
    }
    setShowKeyModal(false);
    toast.success(tempApiKey.trim() ? "Gemini API key saved!" : "Using built-in domain AI engine");
  };

  return (
    <>
      {/* Floating launcher trigger (when closed) */}
      {!isAiOpen && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end">
            <span className="font-mono-data rounded-full border border-border bg-card px-3 py-1 text-xs text-primary shadow-lg backdrop-blur">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-success animate-pulse mr-1.5" />
              AI Copilot Online
            </span>
          </div>

          <button
            onClick={() => setIsAiOpen(true)}
            className="glow-amber group relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95"
            aria-label="Open AI Copilot"
          >
            <Sparkles className="h-6 w-6 transition-transform group-hover:rotate-12" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-4 w-4 rounded-full bg-primary" />
            </span>
          </button>
        </div>
      )}

      {/* Main AI Chat Panel */}
      {isAiOpen && (
        <div
          className={`fixed bottom-4 right-4 z-50 flex flex-col rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur-xl transition-all duration-300 ${
            isExpanded
              ? "w-[94vw] max-w-4xl h-[92vh]"
              : "w-[94vw] sm:w-[440px] md:w-[480px] h-[640px] max-h-[88vh]"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5 bg-secondary/40 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <BrainCircuit className="h-5 w-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm leading-none text-foreground">EdgeWear AI Copilot</h3>
                  <span className="flex h-2 w-2 rounded-full bg-success animate-pulse" />
                </div>
                <p className="font-mono-data text-[11px] text-muted-foreground mt-0.5">
                  Live Sync · Spindle 04
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                title={voiceEnabled ? "Voice Readout On" : "Voice Readout Off"}
                className={`rounded-lg p-2 transition-colors ${
                  voiceEnabled
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>

              <button
                onClick={() => setShowKeyModal(true)}
                title="Custom Gemini API Key"
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Key className="h-4 w-4" />
              </button>

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Collapse" : "Expand"}
                className="hidden sm:block rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>

              <button
                onClick={() => setIsAiOpen(false)}
                title="Close AI Copilot"
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Telemetry Status Bar */}
          <div className="border-b border-border bg-secondary/20 px-4 py-2 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar font-mono-data text-muted-foreground">
              <span className="text-foreground font-medium">{activeMaterial.split(" ")[0]}</span>
              <span>·</span>
              <span>{telemetry.inputs.spindleSpeed} rpm</span>
              <span>·</span>
              <span>{telemetry.inputs.feedRate} mm/r</span>
              <span>·</span>
              <span
                className={
                  telemetry.result.status === "healthy"
                    ? "text-success"
                    : telemetry.result.status === "monitor"
                    ? "text-warning"
                    : "text-destructive"
                }
              >
                VB {telemetry.result.wear.toFixed(3)} mm
              </span>
            </div>

            <button
              onClick={() => handleSendMessage("Analyze current machine telemetry and recommend adjustments")}
              className="shrink-0 text-primary font-medium hover:underline text-[11px] flex items-center gap-1"
            >
              <Sparkles className="h-3 w-3" />
              Diagnose
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`relative max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground font-medium"
                      : "border border-border bg-secondary/40 text-foreground"
                  }`}
                >
                  {/* Content with basic markdown rendering */}
                  <div className="whitespace-pre-wrap leading-relaxed space-y-2 text-xs sm:text-sm">
                    {msg.content.split("\n\n").map((block, idx) => {
                      // Check for markdown headers
                      if (block.startsWith("### ")) {
                        return (
                          <h4 key={idx} className="font-semibold text-primary text-sm pt-1">
                            {block.replace("### ", "")}
                          </h4>
                        );
                      }
                      if (block.startsWith("#### ")) {
                        return (
                          <h5 key={idx} className="font-semibold text-foreground text-xs uppercase tracking-wider pt-1">
                            {block.replace("#### ", "")}
                          </h5>
                        );
                      }
                      return (
                        <p key={idx} className="leading-relaxed">
                          {block}
                        </p>
                      );
                    })}
                  </div>

                  {/* Actions attached to the message */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-border/50">
                      {msg.actions.map((action, i) => (
                        <button
                          key={i}
                          onClick={() => handleActionClick(action)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          <Zap className="h-3 w-3" />
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Footer metadata */}
                  <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground/80">
                    <span>{msg.timestamp}</span>
                    {msg.role === "assistant" && (
                      <button
                        onClick={() => copyToClipboard(msg.id, msg.content)}
                        className="hover:text-foreground flex items-center gap-1"
                        title="Copy message"
                      >
                        {copiedId === msg.id ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-xs text-muted-foreground flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
                  <span>Computing wear kinematics & Taylor life models...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-4 py-2 border-t border-border/60 bg-secondary/15 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => handleSendMessage("Analyze current machine telemetry and recommend adjustments")}
              className="shrink-0 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary hover:text-foreground transition-colors flex items-center gap-1"
            >
              ⚡ Diagnose Telemetry
            </button>
            <button
              onClick={() => handleSendMessage("How can I optimize tool life for Titanium Ti-6Al-4V?")}
              className="shrink-0 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
            >
              🔩 Titanium Ti-6Al-4V
            </button>
            <button
              onClick={() => handleSendMessage("Calculate 10-machine shop ROI and savings")}
              className="shrink-0 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
            >
              💰 Shop ROI Calculation
            </button>
            <button
              onClick={() => handleSendMessage("How does Edge Gateway connect to Fanuc and Siemens CNC controllers?")}
              className="shrink-0 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
            >
              🔌 Fanuc / Haas / Siemens Setup
            </button>
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 border-t border-border bg-card rounded-b-2xl flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask AI Copilot about tool wear, feeds & speeds, ROI..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 rounded-xl border border-border bg-secondary/50 px-3.5 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50 transition-opacity hover:opacity-90"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <button
              onClick={() => setShowKeyModal(false)}
              className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
                <Key className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-semibold text-base">AI Engine Configuration</h3>
                <p className="text-xs text-muted-foreground">Optional: Connect Google Gemini API Key</p>
              </div>
            </div>

            <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
              EdgeWear includes a built-in high-fidelity machining domain intelligence engine that works offline with zero configuration. You can also provide a Gemini 1.5 API key for free-form multi-turn conversational reasoning.
            </p>

            <div className="mt-4">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Google Gemini API Key
              </label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs font-mono-data text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setTempApiKey("");
                  setApiKey("");
                  localStorage.removeItem("edgewear_gemini_key");
                  setShowKeyModal(false);
                  toast.info("Cleared custom API key. Using built-in domain AI.");
                }}
                className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted"
              >
                Clear Key
              </button>
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
