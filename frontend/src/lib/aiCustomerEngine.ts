import { MachineInputs, PredictionResult } from "../context/AiContext";

export type AiMessageAction = {
  type: "apply_parameters" | "open_pilot_modal" | "compare_materials" | "view_roi";
  label: string;
  data?: any;
};

export type AiMessage = {
  id: string;
  role: "assistant" | "user" | "system";
  content: string;
  timestamp: string;
  actions?: AiMessageAction[] | undefined;
  telemetrySnapshot?: {
    inputs: MachineInputs;
    result: PredictionResult;
  } | undefined;
};

export interface MaterialSpec {
  name: string;
  category: string;
  optimalSpeedRange: [number, number]; // RPM based on standard 50mm tool
  optimalFeedRange: [number, number]; // mm/rev
  optimalDepthRange: [number, number]; // mm
  wearRateMultiplier: number;
  criticalFailureMode: string;
  recommendedCoating: string;
  tips: string;
}

export const DEFAULT_MATERIAL_SPEC: MaterialSpec = {
  name: "AISI 4140 Hardened Steel (28-32 HRC)",
  category: "Alloy Steel (ISO P)",
  optimalSpeedRange: [4500, 6500],
  optimalFeedRange: [0.18, 0.28],
  optimalDepthRange: [1.0, 2.5],
  wearRateMultiplier: 1.0,
  criticalFailureMode: "Flank wear (abrasion) and thermal fatigue at high cutting speeds.",
  recommendedCoating: "TiAlN or AlCrN multi-layer PVD",
  tips: "Ensure consistent flood or high-pressure coolant (70 bar) to evacuate chips and control cutting zone temperature.",
};

export const MATERIALS_DATABASE: Record<string, MaterialSpec> = {
  "4140 Alloy Steel": DEFAULT_MATERIAL_SPEC,
  "Inconel 718": {
    name: "Inconel 718 Nickel Superalloy (36-44 HRC)",
    category: "Heat Resistant Superalloy (ISO S)",
    optimalSpeedRange: [2200, 3800],
    optimalFeedRange: [0.10, 0.18],
    optimalDepthRange: [0.8, 1.6],
    wearRateMultiplier: 2.4,
    criticalFailureMode: "Notch wear at depth-of-cut line and severe work-hardening of the cut surface.",
    recommendedCoating: "SiAlON ceramic or tough sub-micron PVD TiAlN",
    tips: "Never dwell the tool. Maintain positive rake angle and vary depth of cut across passes to prevent localized notching.",
  },
  "Ti-6Al-4V Titanium": {
    name: "Titanium Grade 5 (Ti-6Al-4V)",
    category: "Titanium Alloy (ISO S)",
    optimalSpeedRange: [2800, 4200],
    optimalFeedRange: [0.12, 0.20],
    optimalDepthRange: [1.0, 2.0],
    wearRateMultiplier: 1.8,
    criticalFailureMode: "Chemical affinity causing welding/diffusion wear and extreme tool tip heat accumulation (low thermal conductivity).",
    recommendedCoating: "Uncoated micrograin carbide or ultra-smooth AlTiN",
    tips: "High pressure direct-through-spindle coolant is mandatory. Avoid excessive cutting speeds above 75 m/min.",
  },
  "6061-T6 Aluminum": {
    name: "6061-T6 Aircraft Grade Aluminum",
    category: "Non-Ferrous (ISO N)",
    optimalSpeedRange: [7500, 11500],
    optimalFeedRange: [0.22, 0.35],
    optimalDepthRange: [1.5, 3.5],
    wearRateMultiplier: 0.35,
    criticalFailureMode: "Built-up edge (BUE) and chip re-welding on rake face.",
    recommendedCoating: "Polished uncoated carbide or DLC (Diamond-Like Carbon)",
    tips: "Utilize high rake geometries and mirror-polished flutes to maximize chip evacuation.",
  },
  "316L Stainless Steel": {
    name: "AISI 316L Austenitic Stainless Steel",
    category: "Stainless Steel (ISO M)",
    optimalSpeedRange: [3800, 5200],
    optimalFeedRange: [0.14, 0.22],
    optimalDepthRange: [1.0, 2.2],
    wearRateMultiplier: 1.45,
    criticalFailureMode: "Rapid work hardening and adhesion tear.",
    recommendedCoating: "TiCN or AlTiN with high cobalt binder substrate",
    tips: "Avoid shallow passes below 0.5 mm that rub on previously work-hardened material layers.",
  },
};

export function getMaterialSpec(materialName?: string): MaterialSpec {
  if (!materialName) return DEFAULT_MATERIAL_SPEC;
  return MATERIALS_DATABASE[materialName] ?? DEFAULT_MATERIAL_SPEC;
}

export function analyzeTelemetry(
  inputs: MachineInputs,
  result: PredictionResult,
  materialName: string = "4140 Alloy Steel"
): {
  analysisSummary: string;
  recommendedInputs: MachineInputs;
  findings: Array<{ severity: "low" | "medium" | "high"; title: string; detail: string }>;
  estimatedRulGainMinutes: number;
} {
  const mat = getMaterialSpec(materialName);
  const findings: Array<{ severity: "low" | "medium" | "high"; title: string; detail: string }> = [];

  let recSpeed = inputs.spindleSpeed;
  let recFeed = inputs.feedRate;
  let recDepth = inputs.depthOfCut;

  // 1. Spindle speed analysis
  if (inputs.spindleSpeed > mat.optimalSpeedRange[1]) {
    findings.push({
      severity: "high",
      title: "Spindle speed exceeds thermal optimum",
      detail: `Current speed of ${inputs.spindleSpeed} rpm generates excessive cutting interface temperatures for ${materialName}. Taylor wear exponent accelerates flank degradation exponentially (T ∝ v^1.8).`,
    });
    recSpeed = Math.round((mat.optimalSpeedRange[1] * 0.95) / 100) * 100;
  } else if (inputs.spindleSpeed < mat.optimalSpeedRange[0]) {
    findings.push({
      severity: "low",
      title: "Sub-optimal material removal rate (MRR)",
      detail: `Operating at ${inputs.spindleSpeed} rpm is conservative. You can safely increase speed toward ${mat.optimalSpeedRange[0]} rpm without penalizing tool life.`,
    });
  }

  // 2. Vibration & Chatter analysis
  if (inputs.vibration > 4.5) {
    findings.push({
      severity: "high",
      title: "High vibration / regenerative chatter detected",
      detail: `RMS vibration of ${inputs.vibration.toFixed(1)} mm/s indicates dynamic instability or harmonics. This triggers micro-chipping along the cutting edge and degrades surface finish (Ra > 3.2 µm).`,
    });
    recDepth = Math.max(0.5, Number((inputs.depthOfCut * 0.75).toFixed(1)));
    recSpeed = Math.max(1200, Math.round((inputs.spindleSpeed * 0.88) / 100) * 100);
  } else if (inputs.vibration > 3.0) {
    findings.push({
      severity: "medium",
      title: "Elevated vibration signature",
      detail: `RMS vibration of ${inputs.vibration.toFixed(1)} mm/s is above baseline nominal (2.0–2.5 mm/s). Minor depth of cut adjustment recommended.`,
    });
    recDepth = Math.max(0.8, Number((inputs.depthOfCut * 0.85).toFixed(1)));
  }

  // 3. Feed rate & Work-hardening
  if (inputs.feedRate < mat.optimalFeedRange[0] && (materialName.includes("Stainless") || materialName.includes("Inconel") || materialName.includes("Titanium"))) {
    findings.push({
      severity: "medium",
      title: "Feed rate too low (Burnishing / Work-hardening risk)",
      detail: `Feed of ${inputs.feedRate} mm/rev causes the insert hone to rub rather than shear clean chips, work-hardening the substrate on ${materialName}.`,
    });
    recFeed = mat.optimalFeedRange[0];
  } else if (inputs.feedRate > mat.optimalFeedRange[1]) {
    findings.push({
      severity: "medium",
      title: "Mechanical overloading on tool flank",
      detail: `Feed rate of ${inputs.feedRate} mm/rev exceeds the insert chipbreaker limit, escalating cutting force by ~24%.`,
    });
    recFeed = mat.optimalFeedRange[1];
  }

  // 4. Wear & RUL Assessment
  if (result.wear >= 0.3) {
    findings.push({
      severity: "high",
      title: "ISO 3685 Flank Wear Limit (0.30 mm) Exceeded",
      detail: `Current VB of ${result.wear.toFixed(3)} mm has crossed the critical threshold. Immediate tool indexing or replacement required to prevent scrap parts and catastrophic tool breakage.`,
    });
  } else if (result.wear >= 0.22) {
    findings.push({
      severity: "medium",
      title: "Approaching end of tool lifecycle",
      detail: `Estimated remaining useful life is only ${Math.round(result.rul)} minutes. Schedule replacement before launching long cycle-time passes.`,
    });
  }

  // Ensure recommendations are slightly different if no triggers fired
  if (findings.length === 0) {
    findings.push({
      severity: "low",
      title: "Parameters within nominal envelope",
      detail: `Process conditions are stable with confidence ${result.confidence.toFixed(1)}%. Minor optimization can yield up to +15% extended insert duration.`,
    });
    recSpeed = Math.round((inputs.spindleSpeed * 0.94) / 100) * 100;
    recFeed = Number((inputs.feedRate * 1.05).toFixed(2));
  }

  const recommendedInputs: MachineInputs = {
    spindleSpeed: recSpeed,
    feedRate: recFeed,
    depthOfCut: recDepth,
    vibration: Math.max(1.2, Number((inputs.vibration * 0.72).toFixed(1))),
    cuttingTime: inputs.cuttingTime,
  };

  const estimatedRulGainMinutes = Math.max(18, Math.round(result.rul * 0.38));

  const analysisSummary = `Telemetry diagnostics for Spindle 04 cutting **${materialName}**: Current flank wear is **${result.wear.toFixed(3)} mm** (wear rate ${result.wearRate.toFixed(4)} mm/min) with **${Math.round(result.rul)} min** remaining life. ${findings.map((f) => f.title).join("; ")}.`;

  return {
    analysisSummary,
    recommendedInputs,
    findings,
    estimatedRulGainMinutes,
  };
}

export function calculateFleetRoi(fleetSize: number, monthlyScrapRatePct: number = 3.5, avgInsertCost: number = 18) {
  // Typical CNC machine operational model:
  // - 2 shifts/day, 250 days/yr = 4,000 spindle hours/machine
  // - 12 inserts used per machine per week
  // - Average machined part cost: $140
  // - Scrap reduction with EdgeWear: ~70%
  // - Tool-life extension: 31%
  const annualInsertsPerMachine = 12 * 50; // 600 inserts
  const totalInsertsAnnual = annualInsertsPerMachine * fleetSize;
  const insertSavingsDollars = Math.round(totalInsertsAnnual * 0.31 * avgInsertCost);

  const partsProducedPerMachineAnnual = 2800;
  const totalPartsAnnual = partsProducedPerMachineAnnual * fleetSize;
  const scrapPartsWithoutAi = totalPartsAnnual * (monthlyScrapRatePct / 100);
  const scrapPartsSaved = Math.round(scrapPartsWithoutAi * 0.70);
  const scrapSavingsDollars = scrapPartsSaved * 125; // estimated scrap cost per part

  // Spindle crash / tool breakout prevention
  const crashPreventionSavings = fleetSize * 4200; // ~$4,200 avg downtime avoidance per machine

  const totalAnnualSavings = insertSavingsDollars + scrapSavingsDollars + crashPreventionSavings;
  const estimatedHardwareCost = fleetSize * 2400; // Edge gateway + PCB accelerometer pack
  const paybackMonths = Number(((estimatedHardwareCost / totalAnnualSavings) * 12).toFixed(1));

  return {
    fleetSize,
    totalAnnualSavings,
    insertSavingsDollars,
    scrapSavingsDollars,
    scrapPartsSaved,
    crashPreventionSavings,
    paybackMonths,
  };
}

function buildWebsiteGroundingContext(material: string) {
  const materialFacts = Object.entries(MATERIALS_DATABASE)
    .map(([name, spec]) => {
      return `- ${name}: ${spec.category}; speed ${spec.optimalSpeedRange[0]}-${spec.optimalSpeedRange[1]} RPM; feed ${spec.optimalFeedRange[0]}-${spec.optimalFeedRange[1]} mm/rev; depth ${spec.optimalDepthRange[0]}-${spec.optimalDepthRange[1]} mm; main wear: ${spec.criticalFailureMode}; coating: ${spec.recommendedCoating}; tip: ${spec.tips}`;
    })
    .join("\n");

  return `You are EdgeWear AI Copilot. Answer ONLY using the facts below from this EdgeWear website and the current browser telemetry. Do not use outside internet facts or general knowledge. If the user asks something outside the website context, say that you can answer only based on EdgeWear data and site details.

Website facts:
- Product: EdgeWear is a CNC tool wear prediction and condition monitoring portal.
- Core value: real-time tool wear prediction, remaining useful life (RUL), sensor telemetry analytics, and tool-life optimization.
- Supported materials and key machining guidance:
${materialFacts}
- Current default material context: ${material}.
- EdgeWear supports machining data for 4140 steel, Inconel 718, Ti-6Al-4V, 6061-T6 aluminum, and 316L stainless steel.
- The ISO 3685 flank wear limit is 0.30 mm.
- EdgeWear can diagnose tool wear, recommend optimized spindle speed/feed/depth, estimate ROI, and verify controller compatibility.
- Supported CNC controllers include Fanuc, Haas, Siemens, Heidenhain, Mazak, DMG Mori, Okuma via Ethernet, MTConnect, OPC UA, and FOCAS interfaces.
- The EdgeWear gateway is designed for industrial edge deployment with low-latency inference and integrates to MES/SCADA.
- EdgeWear uses a built-in high-fidelity machining domain engine and optional Google Gemini for conversational reasoning only when grounded by the site context.

Current browser telemetry:
- Material: ${material}
- Spindle Speed: ${telemetry.inputs.spindleSpeed} RPM
- Feed Rate: ${telemetry.inputs.feedRate} mm/rev
- Depth of Cut: ${telemetry.inputs.depthOfCut} mm
- Vibration: ${telemetry.inputs.vibration} mm/s RMS
- Cutting Time: ${telemetry.inputs.cuttingTime} min
- Calculated Flank Wear (VB): ${telemetry.result.wear.toFixed(3)} mm
- Remaining Useful Life: ${telemetry.result.rul.toFixed(0)} min
- Wear Rate: ${telemetry.result.wearRate.toFixed(4)} mm/min
- Status: ${telemetry.result.status}

User question: ${userQuery}

Answer concisely, in a professional engineering tone, using only the provided EdgeWear website facts and the current telemetry. Include practical action steps when appropriate.`;
}

export async function generateAiResponse(
  userQuery: string,
  telemetry: { inputs: MachineInputs; result: PredictionResult },
  material: string = "4140 Alloy Steel",
  customApiKey?: string
): Promise<{ text: string; actions?: AiMessageAction[] }> {
  // If user provided a Gemini API Key, we can query Gemini via REST API
  if (customApiKey && customApiKey.trim().length > 10) {
    try {
      const groundedPrompt = buildWebsiteGroundingContext(material);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${customApiKey.trim()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: groundedPrompt }],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              topP: 0.8,
              maxOutputTokens: 500,
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return {
            text,
            actions: [
              { type: "apply_parameters", label: "Apply Optimized Parameters to Predictor" },
              { type: "open_pilot_modal", label: "Request Shop Floor Pilot Kit" },
            ],
          };
        }
      }
    } catch (e) {
      console.warn("Custom API key query failed, using built-in high-fidelity domain engine:", e);
    }
  }

  // High-fidelity domain knowledge engine
  const queryLower = userQuery.toLowerCase();
  const diag = analyzeTelemetry(telemetry.inputs, telemetry.result, material);

  // 1. Analyze / Diagnose / Current status query
  if (
    queryLower.includes("diagnos") ||
    queryLower.includes("analyz") ||
    queryLower.includes("current") ||
    queryLower.includes("wear") ||
    queryLower.includes("why") ||
    queryLower.includes("chatter") ||
    queryLower.includes("telemetry")
  ) {
    const text = `### ⚙️ Live Telemetry Diagnostics: Spindle 04
**Target Material:** ${material} | **ISO 3685 Standard:** VB ≤ 0.30 mm

#### 📊 Current Tool Condition:
* **Flank Wear (VB):** \`${telemetry.result.wear.toFixed(3)} mm\` (${telemetry.result.status.toUpperCase()} status)
* **Wear Progression Rate:** \`${telemetry.result.wearRate.toFixed(4)} mm/min\`
* **Remaining Useful Life (RUL):** **${Math.round(telemetry.result.rul)} minutes**
* **Model Confidence:** \`${telemetry.result.confidence.toFixed(1)}%\`

#### 🔍 Root-Cause Engineering Findings:
${diag.findings.map((f) => `- **[${f.severity.toUpperCase()}] ${f.title}**: ${f.detail}`).join("\n")}

#### 💡 AI-Recommended Parameter Optimization:
| Parameter | Current | Recommended | Expected Impact |
| :--- | :--- | :--- | :--- |
| **Spindle Speed** | ${telemetry.inputs.spindleSpeed} rpm | **${diag.recommendedInputs.spindleSpeed} rpm** | Reduces cutting edge thermal saturation |
| **Feed Rate** | ${telemetry.inputs.feedRate} mm/rev | **${diag.recommendedInputs.feedRate} mm/rev** | Optimizes chip load and avoids rubbing |
| **Depth of Cut ($a_p$)** | ${telemetry.inputs.depthOfCut} mm | **${diag.recommendedInputs.depthOfCut} mm** | Suppresses chatter & deflection harmonics |
| **Projected RUL** | ${Math.round(telemetry.result.rul)} min | **+${diag.estimatedRulGainMinutes} min (+${Math.round((diag.estimatedRulGainMinutes / (telemetry.result.rul || 1)) * 100)}%)** | Safely finishes current batch without scrap |

Click below to apply these parameters directly into the live predictor.`;

    return {
      text,
      actions: [
        {
          type: "apply_parameters",
          label: `Apply AI Parameters (${diag.recommendedInputs.spindleSpeed} RPM / ${diag.recommendedInputs.feedRate} mm/rev)`,
          data: diag.recommendedInputs,
        },
        {
          type: "open_pilot_modal",
          label: "Request Factory Pilot Deployment",
        },
      ],
    };
  }

  // 2. ROI / Cost / Pricing / Fleet Query
  if (
    queryLower.includes("roi") ||
    queryLower.includes("cost") ||
    queryLower.includes("price") ||
    queryLower.includes("save") ||
    queryLower.includes("savings") ||
    queryLower.includes("fleet") ||
    queryLower.includes("dollar")
  ) {
    const roi = calculateFleetRoi(10);
    const text = `### 💰 Machine Shop ROI & Economic Impact Model
Calculated for an average **10-spindle CNC machine shop** (2 shifts/day, aerospace & precision automotive parts):

#### 📈 Annual Projected Savings: **$${roi.totalAnnualSavings.toLocaleString()} / year**
* **Scrap Parts Prevention:** **$${roi.scrapSavingsDollars.toLocaleString()}** (Eliminating ~${roi.scrapPartsSaved} scrapped out-of-tolerance parts per year)
* **Insert Life Extension (+31%):** **$${roi.insertSavingsDollars.toLocaleString()}** (Extending carbide lifecycle via wear-informed indexing)
* **Unplanned Spindle Downtime Avoidance:** **$${roi.crashPreventionSavings.toLocaleString()}** (Catching chipped edges before catastrophic workpiece welding)

#### ⏱️ Investment Payback Horizon:
* **Edge Gateway & Sensor Kit Hardware:** ~$24,000 for 10 machines
* **Full Payback Timeframe:** **${roi.paybackMonths} months**
* **3-Year Net Return on Investment:** **+${Math.round(((roi.totalAnnualSavings * 3 - 24000) / 24000) * 100)}%**

Would you like an official ROI proposal generated for your exact machine count and CNC controller types?`;

    return {
      text,
      actions: [
        {
          type: "open_pilot_modal",
          label: "Generate Custom Shop ROI & Pilot Quote",
        },
        {
          type: "view_roi",
          label: "Explore Interactive ROI Calculator",
        },
      ],
    };
  }

  // 3. Controller & Integration Query
  if (
    queryLower.includes("fanuc") ||
    queryLower.includes("haas") ||
    queryLower.includes("siemens") ||
    queryLower.includes("heidenhain") ||
    queryLower.includes("controller") ||
    queryLower.includes("integrate") ||
    queryLower.includes("connect") ||
    queryLower.includes("opc") ||
    queryLower.includes("mtconnect") ||
    queryLower.includes("sensor")
  ) {
    const text = `### 🔌 Machine Controller & Shop Floor Integration
EdgeWear is designed for **non-invasive, zero-downtime deployment** across brownfield and modern CNC fleets.

#### Supported CNC Controllers:
* **Fanuc CNC:** Series 0i-Model D/F, 30i/31i/32i-Model B via high-speed Ethernet (FOCAS 2 protocol). Reads spindle load, commanded feed, actual feed, and part counters at 100 Hz.
* **Siemens Sinumerik:** 840D sl & Sinumerik ONE via OPC UA Server / Create MyInterface.
* **Haas Automation:** Next-Gen Control (NGC) via Ethernet Q-codes / MTConnect agent.
* **Heidenhain:** TNC 640 / iTNC 530 via Heidenhain DNC Option 18.
* **Mazak / DMG Mori / Okuma:** MTConnect v1.4 / v2.0 REST XML & JSON streams.

#### 📡 Edge Gateway Hardware Architecture:
1. **DIN-Rail Industrial Edge Gateway:** Runs containerized ONNX Runtime ML inference (<45 ms latency) inside the machine electrical cabinet.
2. **Sensor Pack:** Triaxial high-frequency PCB accelerometer (magnetic or M3 stud mount on spindle nose) + non-invasive split-core CT power transducer.
3. **Connectivity:** Isolated dual-Ethernet NIC — one port to CNC controller internal subnet, one port to factory MES/SCADA without exposing the CNC to external internet.`;

    return {
      text,
      actions: [
        {
          type: "open_pilot_modal",
          label: "Verify Compatibility for Your Shop Floor",
        },
      ],
    };
  }

  // 4. Material-specific recommendations
  if (
    queryLower.includes("titanium") ||
    queryLower.includes("inconel") ||
    queryLower.includes("steel") ||
    queryLower.includes("aluminum") ||
    queryLower.includes("stainless") ||
    queryLower.includes("material")
  ) {
    const targetMat =
      Object.keys(MATERIALS_DATABASE).find((m) => {
        const token = m.toLowerCase().split(" ")[0] ?? "";
        return token.length > 0 && queryLower.includes(token);
      }) || material;
    const spec = getMaterialSpec(targetMat);

    const text = `### 🔬 Machining Parameters & Tooling Guide: ${spec.name}
**ISO Classification:** ${spec.category}

#### ⚙️ Target Operational Envelope (for 50mm Face Mill / End Mill):
* **Recommended Spindle Speed:** \`${spec.optimalSpeedRange[0]} – ${spec.optimalSpeedRange[1]} RPM\`
* **Recommended Feed Per Tooth ($f_z$):** \`${spec.optimalFeedRange[0]} – ${spec.optimalFeedRange[1]} mm/tooth\`
* **Depth of Cut ($a_p$):** \`${spec.optimalDepthRange[0]} – ${spec.optimalDepthRange[1]} mm\`
* **Recommended Coating:** \`${spec.recommendedCoating}\`

#### ⚠️ Primary Wear Mechanism & Prevention:
* **Failure Mode:** ${spec.criticalFailureMode}
* **Shop Practice:** ${spec.tips}
* **Wear Multiplier:** \`${spec.wearRateMultiplier}x\` baseline relative to 4140 steel.

Would you like to load this material profile into the predictor?`;

    return {
      text,
      actions: [
        {
          type: "apply_parameters",
          label: `Set Predictor to ${targetMat} Parameters`,
          data: {
            spindleSpeed: Math.round((spec.optimalSpeedRange[0] + spec.optimalSpeedRange[1]) / 2),
            feedRate: Number(((spec.optimalFeedRange[0] + spec.optimalFeedRange[1]) / 2).toFixed(2)),
            depthOfCut: Number(((spec.optimalDepthRange[0] + spec.optimalDepthRange[1]) / 2).toFixed(1)),
            vibration: 2.2,
            cuttingTime: 45,
          },
        },
      ],
    };
  }

  // 5. Default General Assistant
  const text = `Hello! I am your **EdgeWear AI Engineering Copilot**. I assist machine shop operators, programmers, and production managers in maximizing CNC tool life and eliminating scrap parts.

Here is what I can do for you right now:
1. **Live Telemetry Diagnostics:** I can read Spindle 04's live sensor signals (RPM, feed rate, vibration RMS, cutting time) and diagnose tool wear condition according to ISO 3685.
2. **Speed & Feed Optimization:** Calculate optimized parameters for materials like Titanium Ti-6Al-4V, Inconel 718, 4140 Steel, or 6061 Aluminum to add **+30% remaining useful life**.
3. **Machine Shop ROI Assessment:** Calculate scrap reduction savings and payback period for your specific CNC fleet size.
4. **Hardware & Controller Consultation:** Guide you through connecting Fanuc, Haas, Siemens, or Heidenhain controllers to our Edge Gateway.

How can I help optimize your shop floor today?`;

  return {
    text,
    actions: [
      {
        type: "apply_parameters",
        label: "Diagnose Current Predictor Setup",
        data: diag.recommendedInputs,
      },
      {
        type: "open_pilot_modal",
        label: "Book Technical Pilot Consultation",
      },
    ],
  };
}
