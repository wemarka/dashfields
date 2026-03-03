import { useEffect, useState } from "react";
import { DashfieldsIcon, DashfieldsLogoFull } from "@/components/DashfieldsLogo";

// SplashScreen — shown for ~1.5s on first app load, then fades out
export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 1200);
    const doneTimer = setTimeout(() => onDone(), 1700);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div
      className={[
        "fixed inset-0 z-[9999] app-bg flex flex-col items-center justify-center gap-5 transition-opacity duration-500",
        fading ? "opacity-0 pointer-events-none" : "opacity-100",
      ].join(" ")}
    >
      {/* Icon with pulse ring */}
      <div className="relative flex items-center justify-center">
        <span className="absolute w-24 h-24 rounded-full bg-foreground/5 animate-ping" />
        <span className="absolute w-20 h-20 rounded-full bg-foreground/8 animate-pulse" />
        <DashfieldsIcon className="relative w-16 h-16 text-foreground z-10" />
      </div>

      {/* Full wordmark */}
      <DashfieldsLogoFull className="h-9 w-auto text-foreground" />

      {/* Tagline */}
      <p className="text-[11px] text-muted-foreground/50 tracking-[0.25em] uppercase mt-1">
        Social Media Intelligence
      </p>

      {/* Loading dots */}
      <div className="flex gap-1.5 mt-4">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-foreground/30 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
