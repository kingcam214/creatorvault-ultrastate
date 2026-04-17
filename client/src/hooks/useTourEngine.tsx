export function useTourEngine(_tourId?: string, _options?: Record<string, any>) {
  return {
    tourOpen: false,
    steps: [],
    title: "Guided Tour",
    openTour: () => {},
    closeTour: () => {},
    completeTour: () => {},
    skipTour: () => {},
  };
}

export default useTourEngine;
