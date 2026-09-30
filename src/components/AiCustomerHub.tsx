import React, { useState } from "react";
import {
  BrainCircuit,
  Calculator,
  CheckCircle2,
  Cpu,
  Factory,
  MessageSquareCode,
  ShieldCheck,
  Sparkles,
  Zap,
  ArrowRight,
  Sliders,
  DollarSign,
  Layers,
  ChevronRight,
} from "lucide-react";
import { useAi } from "../context/AiContext";
import { MATERIALS_DATABASE, calculateFleetRoi, getMaterialSpec } from "../lib/aiCustomerEngine";
import { toast } from "sonner";

export function AiCustomerHub() {
  const {
    openAiChat,
    setPilotModalOpen,
    activeMaterial,
    setActiveMaterial,
    applyRecommendedParameters,
    telemetry,
  } = useAi();

  const [activeTab, setActiveTab] = useState<"diagnostics" | "roi" | "compatibility">("diagnostics");

  // ROI calculator state
  const [fleetSize, setFleetSize] = useState(10);
  const [insertCost, setInsertCost] = useState(18);
  const [scrapRate, setScrapRate] = useState(3.5);

  const roi = calculateFleetRoi(fleetSize, scrapRate, insertCost);

  // Controller compatibility state
  const [selectedBrand, setSelectedBrand] = useState("Fanuc");

  const CONTROLLER_SPECS: Record<
    string,
    { protocol: string; speed: string; method: string; status: string; details: string }
  > = {
    Fanuc: {
      protocol: "Fanuc FOCAS 2 / HSSB",
      speed: "10 ms cycle",
      method: "Direct High-Speed Ethernet",
      status: "Certified 100% Plug & Play",
      details: "Compatible with Series 0i-D/F, 30i, 31i, 32i, 35i. Extracts actual spindle torque, commanded vs actual feed, servo lag, and alarm codes without machine PLC modifications.",
    },
    Siemens: {
      protocol: "Sinumerik OPC UA / Create MyInterface",
      speed: "20 ms cycle",
      method: "Internal NCU Ethernet Interface",
      status: "Certified 100% Plug & Play",
      details: "Native support for Sinumerik 840D sl and Sinumerik ONE. Pulls /Channel/Spindle/driveLoad, driveCurrent, and tool carrier geometry directly.",
    },
    Haas: {
      protocol: "Next-Gen Control (NGC) MTConnect & Q-Codes",
      speed: "25 ms cycle",
      method: "RJ45 Ethernet to IPC Gateway",
      status: "Certified 100% Plug & Play",
      details: "Direct communication with Haas NGC VF, UMC, and ST series. Monitors macro variables, spindle load % and current tool pot number.",
    },
    Heidenhain: {
      protocol: "Heidenhain DNC (Option 18)",
      speed: "15 ms cycle",
      method: "Ethernet TCP/IP TeleService",
      status: "Certified 100% Plug & Play",
      details: "Full compatibility with TNC 640, TNC 620, and iTNC 530. Captures active tool number, actual spindle RPM, and 3D feed rate.",
    },
    Mazak: {
      protocol: "Mazak SmartBox / MTConnect v1.4+",
      speed: "30 ms cycle",
      method: "Ethernet REST / XML stream",
      status: "Supported via MTConnect",
      details: "Supports SmoothX, SmoothG, and Matrix controls. Real-time telemetry streaming for spindle vibration and cutting load.",
    },
    Okuma: {
      protocol: "Okuma THINC-OSP API",
      speed: "20 ms cycle",
      method: "Windows-embedded Ethernet",
      status: "Certified Native API",
      details: "Compatible with OSP-P300, OSP-P200 controllers. Direct access to spindle load monitor data and tool life management matrices.",
    },
  };

  const handleApplyMaterialPreset = (materialKey: string) => {
    setActiveMaterial(materialKey);
    const spec = getMaterialSpec(materialKey);
    applyRecommendedParameters({
      spindleSpeed: Math.round((spec.optimalSpeedRange[0] + spec.optimalSpeedRange[1]) / 2),
      feedRate: Number(((spec.optimalFeedRange[0] + spec.optimalFeedRange[1]) / 2).toFixed(2)),
      depthOfCut: Number(((spec.optimalDepthRange[0] + spec.optimalDepthRange[1]) / 2).toFixed(1)),
      vibration: 2.1,
      cuttingTime: 45,
    });
    toast.success(`Loaded ${materialKey} parameters into predictor!`, {
      description: `Spindle: ${Math.round((spec.optimalSpeedRange[0] + spec.optimalSpeedRange[1]) / 2)} RPM`,
    });
  };

  return (
    <section id="ai-hub" className="border-t border-border bg-card/40 py-24 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="mx-auto max-w-6xl px-6 relative">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <p className="font-mono-data text-xs tracking-widest text-primary flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              INTELLIGENT CUSTOMER INTERACTION
            </p>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
              AI Machining Advisor & Shop Floor Hub
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Interact with our cutting-edge AI models before deploying to your shop floor. Diagnose live telemetry, forecast machine shop ROI, or verify controller integration.
            </p>
          </div>

          <button
            onClick={() => openAiChat("Give me a comprehensive overview of how EdgeWear optimizes tool life")}
            className="glow-amber inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity shrink-0"
          >
            <Sparkles className="h-4 w-4" />
            Launch AI Copilot
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-border mb-8 overflow-x-auto no-scrollbar gap-2 sm:gap-4">
          <button
            onClick={() => setActiveTab("diagnostics")}
            className={`flex items-center gap-2 pb-4 text-sm font-semibold transition-colors border-b-2 px-3 ${
              activeTab === "diagnostics"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <BrainCircuit className="h-4 w-4" />
            Material & Wear Advisor
          </button>

          <button
            onClick={() => setActiveTab("roi")}
            className={`flex items-center gap-2 pb-4 text-sm font-semibold transition-colors border-b-2 px-3 ${
              activeTab === "roi"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calculator className="h-4 w-4" />
            Shop Floor ROI Calculator
          </button>

          <button
            onClick={() => setActiveTab("compatibility")}
            className={`flex items-center gap-2 pb-4 text-sm font-semibold transition-colors border-b-2 px-3 ${
              activeTab === "compatibility"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Cpu className="h-4 w-4" />
            CNC Controller Compatibility
          </button>
        </div>

        {/* Tab 1: Material & Diagnostics Advisor */}
        {activeTab === "diagnostics" && (() => {
          const currentMat = getMaterialSpec(activeMaterial);
          return (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Material selector column */}
            <div className="rounded-xl border border-border bg-card p-6 lg:col-span-1">
              <h3 className="text-base font-semibold mb-2">Select Workpiece Material</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Different alloys trigger distinct thermal, abrasive, and work-hardening wear signatures.
              </p>

              <div className="space-y-2">
                {Object.keys(MATERIALS_DATABASE).map((matKey) => {
                  const isCurrent = activeMaterial === matKey;
                  const matSpec = getMaterialSpec(matKey);
                  return (
                    <button
                      key={matKey}
                      onClick={() => handleApplyMaterialPreset(matKey)}
                      className={`w-full text-left rounded-lg border p-3 text-xs transition-all flex items-center justify-between ${
                        isCurrent
                          ? "border-primary bg-primary/10 text-foreground font-semibold"
                          : "border-border bg-secondary/30 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                      }`}
                    >
                      <div>
                        <p className="text-foreground">{matKey}</p>
                        <p className="text-[10px] text-muted-foreground">{matSpec.category}</p>
                      </div>
                      {isCurrent ? (
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 opacity-40 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Material details & AI advice column */}
            <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div>
                    <span className="font-mono-data text-xs text-primary font-semibold">
                      {currentMat.category}
                    </span>
                    <h3 className="text-xl font-bold mt-0.5">{currentMat.name}</h3>
                  </div>
                  <span className="font-mono-data rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground">
                    Wear Rate: {currentMat.wearRateMultiplier}x base
                  </span>
                </div>

                <div className="grid sm:grid-cols-3 gap-3 my-4">
                  <div className="rounded-lg border border-border bg-secondary/30 p-3">
                    <p className="text-[11px] text-muted-foreground">Optimal Speed Range</p>
                    <p className="font-mono-data text-sm font-bold text-foreground mt-1">
                      {currentMat.optimalSpeedRange[0]} –{" "}
                      {currentMat.optimalSpeedRange[1]}{" "}
                      <span className="text-xs font-normal text-muted-foreground">rpm</span>
                    </p>
                  </div>

                  <div className="rounded-lg border border-border bg-secondary/30 p-3">
                    <p className="text-[11px] text-muted-foreground">Optimal Feed Range</p>
                    <p className="font-mono-data text-sm font-bold text-foreground mt-1">
                      {currentMat.optimalFeedRange[0]} –{" "}
                      {currentMat.optimalFeedRange[1]}{" "}
                      <span className="text-xs font-normal text-muted-foreground">mm/r</span>
                    </p>
                  </div>

                  <div className="rounded-lg border border-border bg-secondary/30 p-3">
                    <p className="text-[11px] text-muted-foreground">Recommended Coating</p>
                    <p className="text-xs font-semibold text-primary mt-1">
                      {currentMat.recommendedCoating}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 mt-4 text-xs leading-relaxed">
                  <div className="rounded-lg border border-border bg-secondary/20 p-3">
                    <p className="font-semibold text-foreground mb-1">Critical Failure Mode:</p>
                    <p className="text-muted-foreground">{currentMat.criticalFailureMode}</p>
                  </div>

                  <div className="rounded-lg border border-border bg-secondary/20 p-3">
                    <p className="font-semibold text-foreground mb-1">Shop Floor Machining Guideline:</p>
                    <p className="text-muted-foreground">{currentMat.tips}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => {
                    applyRecommendedParameters({
                      spindleSpeed: Math.round((currentMat.optimalSpeedRange[0] + currentMat.optimalSpeedRange[1]) / 2),
                      feedRate: Number(((currentMat.optimalFeedRange[0] + currentMat.optimalFeedRange[1]) / 2).toFixed(2)),
                      depthOfCut: Number(((currentMat.optimalDepthRange[0] + currentMat.optimalDepthRange[1]) / 2).toFixed(1)),
                      vibration: 2.0,
                      cuttingTime: 30,
                    });
                    toast.success(`Loaded parameters into live predictor!`);
                  }}
                  className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-accent transition-colors"
                >
                  ⚡ Sync to Live Predictor
                </button>

                <button
                  onClick={() =>
                    openAiChat(`Diagnose tool wear for ${activeMaterial} with current spindle settings`)
                  }
                  className="glow-amber inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <MessageSquareCode className="h-3.5 w-3.5" />
                  Ask AI Copilot for Full Diagnostic
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: ROI Calculator */}
        {activeTab === "roi" && (
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-1">Configure Shop Floor Parameters</h3>
              <p className="text-xs text-muted-foreground mb-6">
                Adjust your machine count and scrap baselines to estimate annual financial savings.
              </p>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-xs font-medium mb-2">
                    <span className="text-muted-foreground">Number of CNC Machines</span>
                    <span className="font-mono-data text-foreground font-bold">{fleetSize} Machines</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={50}
                    value={fleetSize}
                    onChange={(e) => setFleetSize(Number(e.target.value))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-[oklch(0.78_0.16_75)]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium mb-2">
                    <span className="text-muted-foreground">Current Monthly Part Scrap Rate</span>
                    <span className="font-mono-data text-foreground font-bold">{scrapRate}%</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={0.5}
                    value={scrapRate}
                    onChange={(e) => setScrapRate(Number(e.target.value))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-[oklch(0.78_0.16_75)]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium mb-2">
                    <span className="text-muted-foreground">Average Carbide Insert Cost</span>
                    <span className="font-mono-data text-foreground font-bold">${insertCost} / edge</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={60}
                    step={2}
                    value={insertCost}
                    onChange={(e) => setInsertCost(Number(e.target.value))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-[oklch(0.78_0.16_75)]"
                  />
                </div>
              </div>
            </div>

            {/* Calculated Results */}
            <div className="rounded-xl border border-border bg-card p-6 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Annual Economic Impact
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono-data text-4xl sm:text-5xl font-extrabold text-primary">
                    ${roi.totalAnnualSavings.toLocaleString()}
                  </span>
                  <span className="text-sm text-muted-foreground font-medium">/ year saved</span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-6">
                  <div className="rounded-lg border border-border bg-secondary/30 p-3">
                    <p className="text-[11px] text-muted-foreground">Scrap Parts Avoided</p>
                    <p className="font-mono-data text-lg font-bold text-foreground mt-0.5">
                      ~{roi.scrapPartsSaved.toLocaleString()} parts
                    </p>
                    <p className="text-[10px] text-success font-medium">
                      +${roi.scrapSavingsDollars.toLocaleString()}
                    </p>
                  </div>

                  <div className="rounded-lg border border-border bg-secondary/30 p-3">
                    <p className="text-[11px] text-muted-foreground">Insert Cost Savings</p>
                    <p className="font-mono-data text-lg font-bold text-foreground mt-0.5">+31% Life</p>
                    <p className="text-[10px] text-success font-medium">
                      +${roi.insertSavingsDollars.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-border bg-secondary/20 p-3 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Estimated Investment Payback:</span>
                  <span className="font-mono-data font-bold text-success text-sm">
                    {roi.paybackMonths} Months
                  </span>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => setPilotModalOpen(true)}
                  className="glow-amber flex-1 rounded-lg bg-primary py-2.5 text-center text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  Request Official Pilot Proposal
                </button>
                <button
                  onClick={() =>
                    openAiChat(
                      `Explain the ROI calculation breakdown for a ${fleetSize}-machine CNC shop with a ${scrapRate}% scrap rate`
                    )
                  }
                  className="rounded-lg border border-border bg-card px-4 py-2.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                >
                  Consult AI Copilot
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: CNC Controller Compatibility */}
        {activeTab === "compatibility" && (
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-6 lg:col-span-1">
              <h3 className="text-base font-semibold mb-2">Supported CNC Controllers</h3>
              <p className="text-xs text-muted-foreground mb-4">
                EdgeWear connects to your existing machine network without requiring machine downtime or voiding warranties.
              </p>

              <div className="space-y-2">
                {Object.keys(CONTROLLER_SPECS).map((brand) => {
                  const isCurrent = selectedBrand === brand;
                  return (
                    <button
                      key={brand}
                      onClick={() => setSelectedBrand(brand)}
                      className={`w-full text-left rounded-lg border p-3 text-xs transition-all flex items-center justify-between ${
                        isCurrent
                          ? "border-primary bg-primary/10 text-foreground font-semibold"
                          : "border-border bg-secondary/30 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                      }`}
                    >
                      <span>{brand} CNC</span>
                      <span className="font-mono-data text-[10px] text-primary">
                        {CONTROLLER_SPECS[brand].speed}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="font-mono-data text-xs text-success font-semibold">
                      {CONTROLLER_SPECS[selectedBrand].status}
                    </span>
                    <h3 className="text-2xl font-bold mt-1">{selectedBrand} Controller Integration</h3>
                  </div>
                  <Cpu className="h-6 w-6 text-primary" />
                </div>

                <div className="grid sm:grid-cols-2 gap-3 my-4">
                  <div className="rounded-lg border border-border bg-secondary/30 p-3">
                    <p className="text-[11px] text-muted-foreground">Supported Communication Protocol</p>
                    <p className="font-mono-data text-xs font-semibold text-foreground mt-1">
                      {CONTROLLER_SPECS[selectedBrand].protocol}
                    </p>
                  </div>

                  <div className="rounded-lg border border-border bg-secondary/30 p-3">
                    <p className="text-[11px] text-muted-foreground">Hardware Interconnect Method</p>
                    <p className="font-mono-data text-xs font-semibold text-foreground mt-1">
                      {CONTROLLER_SPECS[selectedBrand].method}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-secondary/20 p-4 text-xs leading-relaxed text-muted-foreground">
                  <p className="font-semibold text-foreground mb-2">Technical Specification:</p>
                  <p>{CONTROLLER_SPECS[selectedBrand].details}</p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => setPilotModalOpen(true)}
                  className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-accent transition-colors"
                >
                  Verify Fleet Wiring Diagram
                </button>

                <button
                  onClick={() =>
                    openAiChat(
                      `How does EdgeWear connect to our ${selectedBrand} CNC controller via ${CONTROLLER_SPECS[selectedBrand].protocol}?`
                    )
                  }
                  className="glow-amber inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Ask AI for {selectedBrand} Integration Steps
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
