import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type MachineInputs = {
  spindleSpeed: number; // rpm
  feedRate: number; // mm/rev
  depthOfCut: number; // mm
  vibration: number; // mm/s RMS
  cuttingTime: number; // min
};

export type PredictionResult = {
  wear: number; // mm flank wear (VB)
  wearRate: number; // mm flank wear per min
  rul: number; // remaining useful life in minutes
  status: "healthy" | "monitor" | "replace";
  confidence: number;
};

export type PilotRequest = {
  companyName: string;
  contactEmail: string;
  fleetSize: number;
  controllerTypes: string[];
  primaryMaterials: string[];
  notes?: string;
  createdAt: string;
};

interface AiContextType {
  // Telemetry from WearPredictor
  telemetry: {
    inputs: MachineInputs;
    result: PredictionResult;
  };
  updateTelemetry: (inputs: MachineInputs, result: PredictionResult) => void;

  // External parameter updates (e.g., from AI recommendations)
  externalInputs: MachineInputs | null;
  applyRecommendedParameters: (inputs: MachineInputs) => void;
  clearExternalInputs: () => void;

  // AI Chat Drawer / Modal state
  isAiOpen: boolean;
  setIsAiOpen: (open: boolean) => void;
  openAiChat: (initialPrompt?: string) => void;
  pendingPrompt: string | null;
  clearPendingPrompt: () => void;

  // Pilot Lead Generation
  pilotModalOpen: boolean;
  setPilotModalOpen: (open: boolean) => void;
  pilotRequests: PilotRequest[];
  submitPilotRequest: (request: Omit<PilotRequest, "createdAt">) => void;

  // Selected Material preset
  activeMaterial: string;
  setActiveMaterial: (material: string) => void;
}

const defaultInputs: MachineInputs = {
  spindleSpeed: 6000,
  feedRate: 0.2,
  depthOfCut: 1.5,
  vibration: 2.8,
  cuttingTime: 90,
};

const defaultResult: PredictionResult = {
  wear: 0.183,
  wearRate: 0.0019,
  rul: 62,
  status: "monitor",
  confidence: 96.2,
};

const defaultAiContext: AiContextType = {
  telemetry: { inputs: defaultInputs, result: defaultResult },
  updateTelemetry: () => undefined,
  externalInputs: null,
  applyRecommendedParameters: () => undefined,
  clearExternalInputs: () => undefined,
  isAiOpen: false,
  setIsAiOpen: () => undefined,
  openAiChat: () => undefined,
  pendingPrompt: null,
  clearPendingPrompt: () => undefined,
  pilotModalOpen: false,
  setPilotModalOpen: () => undefined,
  pilotRequests: [],
  submitPilotRequest: () => undefined,
  activeMaterial: "4140 Alloy Steel",
  setActiveMaterial: () => undefined,
};

const AiContext = createContext<AiContextType | undefined>(undefined);

export function AiProvider({ children }: { children: ReactNode }) {
  const [telemetry, setTelemetry] = useState<{ inputs: MachineInputs; result: PredictionResult }>({
    inputs: defaultInputs,
    result: defaultResult,
  });

  const [externalInputs, setExternalInputs] = useState<MachineInputs | null>(null);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [pilotModalOpen, setPilotModalOpen] = useState(false);
  const [pilotRequests, setPilotRequests] = useState<PilotRequest[]>([]);
  const [activeMaterial, setActiveMaterial] = useState("4140 Alloy Steel");

  const updateTelemetry = useCallback((inputs: MachineInputs, result: PredictionResult) => {
    setTelemetry({ inputs, result });
  }, []);

  const applyRecommendedParameters = useCallback((inputs: MachineInputs) => {
    setExternalInputs(inputs);
  }, []);

  const clearExternalInputs = useCallback(() => {
    setExternalInputs(null);
  }, []);

  const openAiChat = useCallback((initialPrompt?: string) => {
    if (initialPrompt) {
      setPendingPrompt(initialPrompt);
    }
    setIsAiOpen(true);
  }, []);

  const clearPendingPrompt = useCallback(() => {
    setPendingPrompt(null);
  }, []);

  const submitPilotRequest = useCallback((request: Omit<PilotRequest, "createdAt">) => {
    const newReq: PilotRequest = {
      ...request,
      createdAt: new Date().toISOString(),
    };
    setPilotRequests((prev) => [newReq, ...prev]);
  }, []);

  return (
    <AiContext.Provider
      value={{
        telemetry,
        updateTelemetry,
        externalInputs,
        applyRecommendedParameters,
        clearExternalInputs,
        isAiOpen,
        setIsAiOpen,
        openAiChat,
        pendingPrompt,
        clearPendingPrompt,
        pilotModalOpen,
        setPilotModalOpen,
        pilotRequests,
        submitPilotRequest,
        activeMaterial,
        setActiveMaterial,
      }}
    >
      {children}
    </AiContext.Provider>
  );
}

export function useAi() {
  const context = useContext(AiContext);
  return context ?? defaultAiContext;
}
