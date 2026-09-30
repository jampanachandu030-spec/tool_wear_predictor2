import { useMemo, useState } from "react";
import { Activity, Gauge, RotateCw, Timer, Waves, ArrowDownUp } from "lucide-react";

type Inputs = {
  spindleSpeed: number; // rpm
  feedRate: number; // mm/rev
  depthOfCut: number; // mm
  vibration: number; // mm/s RMS
  cuttingTime: number; // min
};

type Result = {
  wear: number; // mm flank wear (VB)
  wearRate: number; // mm flank wear per minute of cutting
  rul: number; // remaining useful life, min
  status: "healthy" | "monitor" | "replace";
  confidence: number;
};

const LIMITS = {
  spindleSpeed: { min: 1000, max: 12000, step: 100, unit: "rpm" },
  feedRate: { min: 0.05, max: 0.5, step: 0.01, unit: "mm/rev" },
  depthOfCut: { min: 0.2, max: 4, step: 0.1, unit: "mm" },
  vibration: { min: 0.5, max: 12, step: 0.1, unit: "mm/s" },
  cuttingTime: { min: 0, max: 240, step: 5, unit: "min" },
};

// Heuristic flank-wear model inspired by Taylor's tool-life equation,
// standing in for the trained ML model in this demo.
function predict(inp: Inputs): Result {
  const speedFactor = Math.pow(inp.spindleSpeed / 6000, 1.8);
  const feedFactor = Math.pow(inp.feedRate / 0.25, 1.1);
  const depthFactor = Math.pow(inp.depthOfCut / 1.5, 0.8);
  const vibFactor = Math.pow(inp.vibration / 3, 1.4);

  const wearRate = 0.0011 * speedFactor * feedFactor * depthFactor * (0.6 + 0.4 * vibFactor);
  const wear = Math.min(0.6, wearRate * inp.cuttingTime + 0.02 * (vibFactor - 1 > 0 ? vibFactor - 1 : 0));

  const vbLimit = 0.3; // ISO 3685 flank-wear limit
  const rul = wearRate > 0 ? Math.max(0, (vbLimit - wear) / wearRate) : 999;

  const status: Result["status"] = wear >= vbLimit ? "replace" : wear >= vbLimit * 0.7 ? "monitor" : "healthy";
  const confidence = Math.max(82, Math.min(98, 96 - Math.abs(inp.vibration - 3) * 1.2));

  return { wear, wearRate, rul, status, confidence };
}

const STATUS_STYLE = {
  healthy: { label: "Healthy", classes: "bg-success/15 text-success border-success/40" },
  monitor: { label: "Monitor closely", classes: "bg-warning/15 text-warning border-warning/40" },
  replace: { label: "Replace tool", classes: "bg-destructive/15 text-destructive border-destructive/40" },
} as const;

function SliderRow({
  label,
  icon: Icon,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  icon: typeof Gauge;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="h-4 w-4 text-primary" />
          {label}
        </span>
        <span className="font-mono-data text-sm font-medium text-foreground">
          {value} <span className="text-muted-foreground">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-[oklch(0.78_0.16_75)]"
      />
    </div>
  );
}

export function WearPredictor() {
  const [inputs, setInputs] = useState<Inputs>({
    spindleSpeed: 6000,
    feedRate: 0.2,
    depthOfCut: 1.5,
    vibration: 2.8,
    cuttingTime: 90,
  });

  const result = useMemo(() => predict(inputs), [inputs]);
  const wearPct = Math.min(100, (result.wear / 0.6) * 100);
  const status = STATUS_STYLE[result.status];

  const set = (key: keyof Inputs) => (v: number) => setInputs((p) => ({ ...p, [key]: v }));

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Inputs */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-1 text-lg font-semibold">Machining parameters</h3>
        <p className="mb-6 text-sm text-muted-foreground">
          Adjust the live process signals — the model re-scores wear instantly.
        </p>
        <div className="space-y-6">
          <SliderRow label="Spindle speed" icon={RotateCw} value={inputs.spindleSpeed} {...LIMITS.spindleSpeed} onChange={set("spindleSpeed")} />
          <SliderRow label="Feed rate" icon={ArrowDownUp} value={inputs.feedRate} {...LIMITS.feedRate} onChange={set("feedRate")} />
          <SliderRow label="Depth of cut" icon={Gauge} value={inputs.depthOfCut} {...LIMITS.depthOfCut} onChange={set("depthOfCut")} />
          <SliderRow label="Vibration (RMS)" icon={Waves} value={inputs.vibration} {...LIMITS.vibration} onChange={set("vibration")} />
          <SliderRow label="Cutting time" icon={Timer} value={inputs.cuttingTime} {...LIMITS.cuttingTime} onChange={set("cuttingTime")} />
        </div>
      </div>

      {/* Output */}
      <div className="flex flex-col rounded-xl border border-border bg-card p-6">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Prediction</h3>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${status.classes}`}>
            {status.label}
          </span>
        </div>

        <div className="mb-6">
          <div className="mb-2 flex items-end justify-between">
            <span className="text-sm text-muted-foreground">Flank wear (VB)</span>
            <span className="font-mono-data text-3xl font-bold text-primary">
              {result.wear.toFixed(3)}
              <span className="ml-1 text-base font-normal text-muted-foreground">mm</span>
            </span>
          </div>
          <div className="relative h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${wearPct}%`,
                background:
                  result.status === "healthy"
                    ? "var(--color-success)"
                    : result.status === "monitor"
                      ? "var(--color-warning)"
                      : "var(--color-destructive)",
              }}
            />
            <div className="absolute top-0 h-full w-px bg-foreground/60" style={{ left: "50%" }} />
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground font-mono-data">
            <span>0</span>
            <span>0.30 limit</span>
            <span>0.60</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-secondary/50 p-4">
            <p className="text-xs text-muted-foreground">Remaining useful life</p>
            <p className="font-mono-data mt-1 text-2xl font-semibold text-foreground">
              {result.rul > 480 ? "480+" : Math.round(result.rul)}
              <span className="ml-1 text-sm font-normal text-muted-foreground">min</span>
            </p>
          </div>
          <div className="rounded-lg border border-border bg-secondary/50 p-4">
            <p className="text-xs text-muted-foreground">Model confidence</p>
            <p className="font-mono-data mt-1 text-2xl font-semibold text-foreground">
              {result.confidence.toFixed(1)}
              <span className="ml-1 text-sm font-normal text-muted-foreground">%</span>
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-border bg-secondary/30 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Model formula · Taylor-style wear law
          </p>
          <div className="font-mono-data space-y-2 text-xs leading-relaxed">
            <p className="text-foreground/90">
              VB = 0.0011 · (n/6000)<sup>1.8</sup> · (f/0.25)<sup>1.1</sup> · (a<sub>p</sub>/1.5)<sup>0.8</sup> · (0.6 + 0.4·(v/3)<sup>1.4</sup>) · t
            </p>
            <p className="text-primary">
              wear rate = {result.wearRate.toFixed(5)} mm/min → VB = {result.wear.toFixed(3)} mm
            </p>
            <p className="text-primary">
              RUL = (0.30 − VB) / wear rate = {result.rul > 480 ? "480+" : Math.round(result.rul)} min
            </p>
            <p className="text-muted-foreground">
              n = {inputs.spindleSpeed} rpm · f = {inputs.feedRate} mm/rev · a<sub>p</sub> = {inputs.depthOfCut} mm · v = {inputs.vibration} mm/s · t = {inputs.cuttingTime} min
            </p>
          </div>
        </div>

        <div className="mt-auto pt-6">
          <div className="flex items-start gap-3 rounded-lg border border-border bg-secondary/30 p-4">
            <Activity className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-sm text-muted-foreground">
              {result.status === "healthy" &&
                "Wear is well below the ISO 3685 limit. Continue the current cycle; next inspection at scheduled interval."}
              {result.status === "monitor" &&
                "Wear is approaching the 0.30 mm limit. Reduce feed rate or plan a tool change within the next shift."}
              {result.status === "replace" &&
                "Flank wear exceeds the 0.30 mm limit. Replace the insert now to protect surface finish and avoid scrap."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
