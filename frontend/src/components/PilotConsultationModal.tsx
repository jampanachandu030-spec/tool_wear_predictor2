import React, { useState } from "react";
import { CheckCircle2, Factory, Mail, ShieldAlert, Sparkles, X, Download, Calendar, ArrowRight } from "lucide-react";
import { useAi } from "../context/AiContext";

export function PilotConsultationModal() {
  const { pilotModalOpen, setPilotModalOpen, submitPilotRequest, telemetry, activeMaterial } = useAi();

  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [fleetSize, setFleetSize] = useState(8);
  const [selectedControllers, setSelectedControllers] = useState<string[]>(["Fanuc FOCAS 2", "Haas NGC"]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([activeMaterial]);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!pilotModalOpen) return null;

  const CONTROLLERS = ["Fanuc FOCAS 2", "Haas NGC", "Siemens 840D / ONE", "Heidenhain TNC", "Mazak / Mazatrol", "Okuma OSP"];
  const MATERIALS = ["4140 Alloy Steel", "Inconel 718", "Ti-6Al-4V Titanium", "6061-T6 Aluminum", "316L Stainless", "Cast Iron"];

  const toggleController = (c: string) => {
    setSelectedControllers((prev) =>
      prev.includes(c) ? prev.filter((item) => item !== c) : [...prev, c]
    );
  };

  const toggleMaterial = (m: string) => {
    setSelectedMaterials((prev) =>
      prev.includes(m) ? prev.filter((item) => item !== m) : [...prev, m]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !contactEmail.trim()) return;

    submitPilotRequest({
      companyName,
      contactEmail,
      fleetSize,
      controllerTypes: selectedControllers,
      primaryMaterials: selectedMaterials,
      notes,
    });
    setSubmitted(true);
  };

  const handleDownloadReport = () => {
    const reportText = `==========================================================
EDGEWEAR CNC CONDITION MONITORING & AI COPILOT
FACTORY PILOT DEPLOYMENT SPECIFICATION & SHOP REPORT
==========================================================
Date: ${new Date().toLocaleDateString()}
Company: ${companyName || "Machine Shop"}
Contact Email: ${contactEmail}
Spindle Fleet Size: ${fleetSize} machines
Controllers Target: ${selectedControllers.join(", ") || "Standard CNC"}
Primary Materials: ${selectedMaterials.join(", ") || "General Alloys"}

TELEMETRY BASELINE AUDIT:
- Target Spindle: Spindle 04
- Spindle Speed: ${telemetry.inputs.spindleSpeed} RPM
- Feed Rate: ${telemetry.inputs.feedRate} mm/rev
- Vibration RMS: ${telemetry.inputs.vibration} mm/s
- Flank Wear (VB): ${telemetry.result.wear.toFixed(3)} mm
- Remaining Useful Life: ${Math.round(telemetry.result.rul)} min
- Model Confidence: ${telemetry.result.confidence.toFixed(1)}%

PILOT PROGRAM DELIVERABLES:
1. Two (2) EdgeWear DIN-Rail Edge Gateways with preloaded PyTorch/ONNX models
2. Four (4) PCB Piezotronics triaxial accelerometers with magnetic mounts
3. Turnkey integration with shop Fanuc/Haas/Siemens network
4. 30-day proof of concept: guaranteed 25%+ tool life extension & zero scrap parts
5. Dedicated Antigravity / EdgeWear Application Engineer assigned

Engineer Assigned: Marcus Vance (Principal Machining Systems Engineer)
Estimated Hardware Dispatch: Within 48 hours
Support Hotline: industrial-support@edgewear.internal
==========================================================`;

    const blob = new Blob([reportText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `EdgeWear-Pilot-Spec-${(companyName || "Shop").replace(/\s+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl sm:p-8 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={() => {
            setPilotModalOpen(false);
            setSubmitted(false);
          }}
          className="absolute right-4 top-4 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {!submitted ? (
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
                <Factory className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold sm:text-2xl">Request Factory Pilot Kit</h2>
                <p className="text-sm text-muted-foreground">
                  Deploy EdgeWear on 1–2 test machines to validate wear prediction & scrap savings with your own tools.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Company / Machine Shop *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Precision Aero"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-border bg-secondary/50 px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Work Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="engineer@shop.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-border bg-secondary/50 px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>CNC Machines in Fleet</span>
                  <span className="font-mono-data text-primary text-sm font-bold">{fleetSize} Spindles</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={fleetSize}
                  onChange={(e) => setFleetSize(Number(e.target.value))}
                  className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-[oklch(0.78_0.16_75)]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Select CNC Controllers On Your Floor
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {CONTROLLERS.map((c) => {
                    const active = selectedControllers.includes(c);
                    return (
                      <button
                        type="button"
                        key={c}
                        onClick={() => toggleController(c)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          active
                            ? "border-primary bg-primary/20 text-primary"
                            : "border-border bg-secondary/40 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                        }`}
                      >
                        {active ? "✓ " : "+ "}
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Primary Difficult Materials
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {MATERIALS.map((m) => {
                    const active = selectedMaterials.includes(m);
                    return (
                      <button
                        type="button"
                        key={m}
                        onClick={() => toggleMaterial(m)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          active
                            ? "border-primary bg-primary/20 text-primary"
                            : "border-border bg-secondary/40 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                        }`}
                      >
                        {active ? "✓ " : "+ "}
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Additional Machining Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Facing chatter issues on high-aspect end mills; current carbide life is under 40 minutes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-border bg-secondary/50 px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPilotModalOpen(false)}
                  className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="glow-amber inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <Sparkles className="h-4 w-4" />
                  Submit Pilot Request
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/20 text-success">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold">Pilot Deployment Approved!</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              Thank you, <strong>{companyName}</strong>. Our engineering applications team has scheduled your 30-day EdgeWear factory pilot test.
            </p>

            <div className="mt-6 rounded-xl border border-border bg-secondary/40 p-4 text-left font-mono-data text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Application Engineer:</span>
                <span className="text-foreground font-semibold">Marcus Vance (Principal CNC AI)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kit Specification:</span>
                <span className="text-foreground">2x Industrial Edge Gateways + 4x Accelerometers</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Controller Support:</span>
                <span className="text-primary">{selectedControllers.join(", ") || "Standard CNC"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimated Dispatch:</span>
                <span className="text-success font-semibold">Within 48 Hours</span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={handleDownloadReport}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                <Download className="h-4 w-4 text-primary" />
                Download Pilot Specification (.txt)
              </button>
              <button
                onClick={() => {
                  setPilotModalOpen(false);
                  setSubmitted(false);
                }}
                className="glow-amber rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
