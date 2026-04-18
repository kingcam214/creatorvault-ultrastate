import React from "react";

type GuidedModeState = {
  checklist?: Record<string, any> & {
    completionPercent?: number;
    itemsCompleted?: number;
    totalItems?: number;
  };
  openChecklist: () => void;
  startTour: (tourId?: string) => void;
};

const defaultState: GuidedModeState = {
  checklist: {
    completionPercent: 0,
    itemsCompleted: 0,
    totalItems: 6,
  },
  openChecklist: () => {},
  startTour: () => {},
};

const GuidedModeContext = React.createContext<GuidedModeState>(defaultState);

export function GuidedModeProvider({ children }: { children?: React.ReactNode }) {
  return (
    <GuidedModeContext.Provider value={defaultState}>
      {children}
    </GuidedModeContext.Provider>
  );
}

export function useGuidedMode() {
  return React.useContext(GuidedModeContext);
}

export default GuidedModeProvider;
