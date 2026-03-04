/**
 * DemoModeContext.tsx
 * Global context for Interactive Demo Mode.
 * When active, the app shows sample data and a persistent banner.
 */
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

interface DemoModeContextType {
  isDemoMode: boolean;
  enableDemo: () => void;
  disableDemo: () => void;
  toggleDemo: () => void;
}

const DemoModeContext = createContext<DemoModeContextType>({
  isDemoMode: false,
  enableDemo: () => {},
  disableDemo: () => {},
  toggleDemo: () => {},
});

const DEMO_KEY = "dashfields-demo-mode";

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    return localStorage.getItem(DEMO_KEY) === "true";
  });

  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem(DEMO_KEY, "true");
      document.documentElement.setAttribute("data-demo", "true");
    } else {
      localStorage.removeItem(DEMO_KEY);
      document.documentElement.removeAttribute("data-demo");
    }
  }, [isDemoMode]);

  const enableDemo  = useCallback(() => setIsDemoMode(true), []);
  const disableDemo = useCallback(() => setIsDemoMode(false), []);
  const toggleDemo  = useCallback(() => setIsDemoMode(d => !d), []);

  return (
    <DemoModeContext.Provider value={{ isDemoMode, enableDemo, disableDemo, toggleDemo }}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  return useContext(DemoModeContext);
}
