import { useEffect, useState } from "react";
import { DashfieldsIcon, DashfieldsLogoFull } from "@/app/components/DashfieldsLogo";

// SplashScreen — shown for ~1.8s on first app load per session, then fades out
export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"enter" | "visible" | "exit">("enter");

  useEffect(() => {
    // enter → visible after 50ms (allow paint)
    const t1 = setTimeout(() => setPhase("visible"), 50);
    // visible → exit after 1.6s
    const t2 = setTimeout(() => setPhase("exit"), 1600);
    // unmount after fade-out (500ms)
    const t3 = setTimeout(() => onDone(), 2100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div
      className={[
        "fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-0",
        "bg-background transition-opacity duration-500",
        phase === "enter"   ? "opacity-0" : "",
        phase === "visible" ? "opacity-100" : "",
        phase === "exit"    ? "opacity-0 pointer-events-none" : "",
      ].join(" ")}
    >
      {/* Background subtle radial glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-brand/5 blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative flex flex-col items-center gap-6">
        {/* Icon with animated rings */}
        <div className="relative flex items-center justify-center">
          <span
            className={[
              "absolute w-40 h-40 rounded-full border border-brand/10",
              "transition-all duration-1000",
              phase === "visible" ? "scale-100 opacity-100" : "scale-50 opacity-0",
            ].join(" ")}
          />
          <span
            className={[
              "absolute w-28 h-28 rounded-full border border-brand/20",
              "transition-all duration-700 delay-100",
              phase === "visible" ? "scale-100 opacity-100" : "scale-50 opacity-0",
            ].join(" ")}
          />
          <div
            className={[
              "relative z-10 transition-all duration-500 delay-150",
              phase === "visible" ? "scale-100 opacity-100" : "scale-75 opacity-0",
            ].join(" ")}
          >
            <DashfieldsIcon className="w-24 h-24 text-brand dark:text-white" />
          </div>
        </div>

        {/* Full wordmark */}
        <div
          className={[
            "transition-all duration-500 delay-300",
            phase === "visible" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
          ].join(" ")}
        >
          <DashfieldsLogoFull className="h-10 w-auto text-brand dark:text-white" />
        </div>

        {/* Tagline */}
        <div
          className={[
            "transition-all duration-500 delay-500",
            phase === "visible" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
          ].join(" ")}
        >
          <p className="text-[11px] text-muted-foreground/50 tracking-[0.3em] uppercase">
            Social Media Intelligence
          </p>
        </div>

        {/* Loading bar */}
        <div
          className={[
            "w-32 h-0.5 rounded-full bg-border overflow-hidden mt-2",
            "transition-all duration-500 delay-600",
            phase === "visible" ? "opacity-100" : "opacity-0",
          ].join(" ")}
        >
          <div
            className={[
              "h-full bg-brand dark:bg-white rounded-full",
              "transition-all duration-[1400ms] ease-out delay-700",
              phase === "visible" ? "w-full" : "w-0",
            ].join(" ")}
          />
        </div>
      </div>
    </div>
  );
}
