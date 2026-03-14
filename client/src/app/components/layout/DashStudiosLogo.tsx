/**
 * DashStudiosLogo.tsx — Cinematic SVG logo for the Topbar nav.
 * White-to-gray gradient fill with red shimmer sweep, lens flare core,
 * anamorphic streaks, ghost rings, chromatic aberration, and hexagonal bokeh.
 * All effects are triggered on hover and follow the mouse within the logo.
 */
import { useRef, useEffect, useCallback } from "react";
import { cn } from "@/core/lib/utils";

interface DashStudiosLogoProps {
  className?: string;
}

/* All SVG path data from the original logo */
const PATHS = [
  "M2373.53,1104.91l255.69,106.5-27.87,95.35.04,1160.04c-.2,5.81-4.28,8.52-7.71,12.29-6.66,7.29-81.75,64.57-90.69,69.3-3.79,2.01-7.29,4.31-11.79,4.49l-275.77-119.91c-10.57-8.84-94.24-138.36-101.32-154.68-5.67-13.09-8.01-54.05-8.81-71.19-11.23-241.35,3.06-497.96,4.36-740.03.59-109.53,8.35-241.46-.02-348.31-3.33-42.44-23.5-88.03-32.13-129.83l255.71,102.48-27.9,95.33c-1.14,268.1,2.02,536.26.36,804.36-.51,82.43-15.7,181.8.71,262.91,5.53,27.33,47.41,46.13,72.05,52.3,19.65,4.92,21.42-14.84,23.2-31.25l.02-1048.33-28.13-121.83Z",
  "M2673.5,2628.89l32.16-125.8v-1176.34s-27.77-91.15-27.77-91.15c1.97-6.13,11.53-8.63,16.91-11.38,51.82-26.44,123.28-51.19,178.82-73.18,48.11-19.05,126.12-56.33,172.66-67.45,5.96-1.42,9.46-3.31,16.27-2.06,5.83,1.07,89.36,57.9,98.6,65.72,5.31,4.49,11.44,7.79,12.24,15.76l-.74,1135.06-109.64,170.36-389.5,160.46ZM2897.49,2340.91c38.77-12.97,95.14-25.71,92.17-77.83l-.53-923.81c-7.18-53.7-61.53-9.19-91.64-2.36v1004Z",
  "M1501.47,1248.89l-198.06-79.9c-9.13-86.4,5.54-180.71-1.78-266.22-1.58-18.39-4.71-35.91-20.39-47.61-4.3-3.21-42.97-21.01-46.38-21.34-14.37-1.38-19.39,14.45-20.99,25.48-7.55,52.12-4.09,176.03-.55,231.78,4.18,65.93,22.39,89.83,60.28,139.72,69.86,92,202.74,211.33,219.41,324.59,20.68,140.56-9.23,300.59.4,443.43-2.04,10.7-92.76,85.67-101.87,85.91l-267.47-116.39-97.61-150.39c1.77-34.28-4.05-69.78-5.12-102.88-3.13-96.5,8.28-195-7.8-290.16l198.13,83.83c7.46,11.02-1.43,229.14,1.9,266.1,4.8,53.23,30,53.24,74.19,69.96l12.85-14.79c-9.4-95.32,25.85-243.74-23.82-326.39-53.89-89.68-151.97-178.57-212.85-267.15-26.02-37.86-39.14-70.55-42.59-117.41-10.16-137.87,7.51-288.48.63-427.68l7.68-24.32,93.78-68.58,264.85,109.64c40.94,46.94,75.08,107.6,104.96,163.04,4.54,125.64-8.67,253.27,8.24,377.72Z",
  "M2033.49,1220.91c-6.98,1.74-8-2.89-12.03-5.97-44.34-33.96-72.71-96.84-135.97-102.03v1078c0,15.64,24.62,80.24,30.23,101.79.94,3.6,4.34,11.91-.27,12.26l-257.47-109.98,31.68-91.9v-1071.49c-.7-2.85-44.56-22.12-50.36-22.51-25.04-1.66-66.35,17.24-93.81,15.83v-252l488,198v250Z",
  "M3836.22,769.79l95.2,75.2,1.83,1141.68-87.86,156.14-253.32,105.49-88.5-79.45c-12.94-380.65-3.14-763.97-5.82-1145.67l89.64-154.36,248.83-99.03ZM3739.5,994.53c-26.86-.86-68.5,29.58-66.03,60.38,3.22,283.74-6.11,568.8,4.18,851.85.75,20.51-5.03,95.64,5.73,106.25,17.95,17.7,80.92-18.96,74.12-50.07l.14-936.17c-.22-11.53-3.7-31.78-18.14-32.24Z",
  "M4253.49,1124.91v-298c0-3.95-6.26-18.68-7.66-24.34-8.55-11.64-49.72,5.99-58.44,14.25-6.41,6.07-11.51,18.5-12.94,27.06-7.26,43.37-7.27,254.72,0,298.09,7.3,43.61,74.12,69.15,110.96,89.04s112.26,46.21,130.12,81.88c8.63,17.24,12.86,50.15,14.13,69.87,8.31,128.63-6.34,266.33-.41,395.92-1.67,10.72-74.62,140.31-84.33,151.67-7.11,8.31-15.49,10.61-24.73,15.27-71.54,36.04-155.65,61.02-228.81,95.23l-86.11-73.7-3.69-8.31c3.21-23.03-3.34-46.16-4.26-67.74-4.22-99.64,8.57-200.83-7.45-299.46l183.61-74.7v274c0,8.04,10.22,22.56,20.96,21.35,23.44-2.64,52.04-18.09,57.26-43.13,7.88-37.74,6.72-228.21.73-269.18-1.07-7.34-3.91-18.09-7.49-24.51-22.1-39.73-156.27-86.76-200.67-115.33-36.86-23.72-44.03-58.81-46.96-101.04-9.8-141.08,7.45-293.61.42-435.91,1.25-8,69.53-130.97,77.98-142.02,8.63-11.3,18.86-14.91,31.09-20.91,70.87-34.78,153.24-57.15,225.03-91.37,8.05-.74,13.02,4.91,18.97,8.75,8.31,5.36,68.05,52.58,70.96,57.01,4.07,6.19,3.32,9.49,3.96,16.04,10.09,103-7.06,223.11-.41,328.41,1.47,23.2,6.94,48.72,11.64,71.56l-183.47,74.28Z",
  "M3453.47,920.94l-28.13,113.83-.03,1168.31,28.46,103.48-232.27,94.33c8.1-44.87,28.93-88.11,32.16-133.8,2.17-30.61-4.06-59.44-4.37-87.99-3.81-354.7,3.11-709.64.36-1064.36l-27.86-99.27,231.68-94.54Z",
  "M2629.49,628.91c-1.89,26.45-1.82,51.46.02,77.98,7.82,112.78,22.18,238.99,36.49,351.51,2.88,22.62,7.77,44.44,13.64,66.43,1.35,5.05,4.4,4.92-4.21,4.19-24.07-2.02-60.41-26.84-85.43-32.64,10.01-34.6,3.37-63.68,3.1-99.09l-43.43-8.22c-7.29,30.09-4.82,61.49-.22,91.83l-83.93-32.07c.02-15.04,9.23-27.81,11.65-42.25,15.54-92.82,25.71-220.69,32.14-315.87,1.5-22.19,1.85-39.82-3.82-61.81h124ZM2585.47,924.91l-11.83-186.14-8.11-13.85-12.25,185.92c-1.73,11.12,29.77,16.55,32.19,14.07Z",
  "M2769.49,1018.91c.7,2.5,9.02,10.11,13.3,9.39,34.35-3.33,26.02-108.48,14.49-121.19-19.61-21.6-89.23-41.44-98.01-69.99l-1.7-166.14c8.43-14.25,25.21-38.79,42.11-41.89,15.79-2.89,95.23-1.87,107.3,4.32,48.87,25.04,25.32,102.63,30.3,147.3l-71.79,12.2v-90c0-14.51-27.05-19.76-33.34-5.09-3.99,9.31-4.81,86.05-1.83,96.26,9.33,31.97,101.68,36.57,107.33,96.67,2.43,25.9,3.39,95.52-.41,119.9s-36.72,58.78-58.33,69.67c-9.18,4.63-74.75,31.38-80.11,31.55-12.7.4-39.6-18.62-41.51-32.77-5.79-42.82,4.23-99.26.76-143.64l6.03-5.97,65.41-8.59c4.63,25.65-6.25,75.76,0,98Z",
  "M2261.49,628.91h146c6.12,0,42.82,35,41.77,46.23l-1.85,317.69c-10.22,11.64-27.21,28.37-43.94,28.32-7.12-.02-121.64-45.02-132.83-51.39-3.25-1.85-7.71-3.1-8.68-7.27,3.08-11.17,6.89-19.28,7.67-31.42,4.74-72.96,5.99-192.19,0-264.33-1.19-14.31-7.23-24.16-8.16-37.84ZM2341.49,690.91v240c5.04,10.64,36,13.92,36,4v-236c0-4.6-22.47-17.93-29.43-13.65l-6.57,5.65Z",
  "M2989.49,628.91c3.91,3.68-8,26.03-8,30v112c0,9.21,36.57,4.05,39.48-4.52,1.01-46.23,3.34-92.41-7.48-137.48h88c-5.35,18.61-10.73,33.97-12.17,53.83-4.4,60.75-6.36,181.19.15,240.2,1.55,14.04,8.64,26.13,11.7,39.66l-87.63,38.32c12.46-55.13,6.92-111.71,7.96-168.01l-36.08,5.93c-4.51,2.9-3.58,7.48-4.13,11.87-3.49,27.88-2.2,91.18.05,120.38,1.04,13.52,6.44,22.49,7.77,35.21l-87.57,38.62c1.08-14.54,6.97-26.98,8.1-41.86,6.99-91.93,6.23-239.9.03-332.31-1.03-15.35-4.45-27.3-8.17-41.83h88Z",
];

// SVG viewBox center
const CX = 2752;
const CY = 1536;
const VW = 5504;
const VH = 3072;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function DashStudiosLogo({ className }: DashStudiosLogoProps) {
  const sceneRef = useRef<HTMLSpanElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const rafRef = useRef<number>(0);

  // Animation state refs (avoid re-renders)
  const hoveringRef = useRef(false);
  const mouseXRef = useRef(0);
  const mouseYRef = useRef(0);
  const targetSvgXRef = useRef(CX);
  const targetSvgYRef = useRef(CY);
  const curSvgXRef = useRef(CX);
  const curSvgYRef = useRef(CY);
  const shimmerXRef = useRef(-2000);
  const shimmerActiveRef = useRef(false);
  const shimmerOpRef = useRef(0);
  const flareOpRef = useRef(0);

  // SVG element refs
  const shimmerBarRef = useRef<SVGRectElement>(null);
  const flareGlowRef = useRef<SVGCircleElement>(null);
  const flareCoreRef = useRef<SVGCircleElement>(null);
  const flareStreakRef = useRef<SVGRectElement>(null);
  const flareStreakWideRef = useRef<SVGRectElement>(null);
  const ghostRing1Ref = useRef<SVGCircleElement>(null);
  const ghostRing2Ref = useRef<SVGCircleElement>(null);
  const ghostRing3Ref = useRef<SVGCircleElement>(null);
  const chromaRRef = useRef<SVGCircleElement>(null);
  const chromaGRef = useRef<SVGCircleElement>(null);
  const chromaBRef = useRef<SVGCircleElement>(null);
  const hex1Ref = useRef<SVGPolygonElement>(null);
  const hex2Ref = useRef<SVGPolygonElement>(null);
  const hex3Ref = useRef<SVGPolygonElement>(null);

  const toSvg = useCallback((clientX: number, clientY: number) => {
    const r = sceneRef.current?.getBoundingClientRect();
    if (!r) return { x: CX, y: CY };
    return {
      x: ((clientX - r.left) / r.width) * VW,
      y: ((clientY - r.top) / r.height) * VH,
    };
  }, []);

  const animate = useCallback(() => {
    const hovering = hoveringRef.current;

    // Opacity transitions
    shimmerOpRef.current = hovering
      ? Math.min(1, shimmerOpRef.current + 0.04)
      : Math.max(0, shimmerOpRef.current - 0.06);
    flareOpRef.current = hovering
      ? Math.min(0.9, flareOpRef.current + 0.03)
      : Math.max(0, flareOpRef.current - 0.06);

    // Smooth SVG coordinates
    curSvgXRef.current = lerp(curSvgXRef.current, targetSvgXRef.current, 0.06);
    curSvgYRef.current = lerp(curSvgYRef.current, targetSvgYRef.current, 0.06);

    const so = shimmerOpRef.current;
    const fo = flareOpRef.current;
    const sx = curSvgXRef.current;
    const sy = curSvgYRef.current;

    // ── Red Shimmer inside logo ──
    if (shimmerActiveRef.current || so > 0) {
      shimmerXRef.current += 55;
      if (shimmerXRef.current > 7500) {
        shimmerXRef.current = -2000;
        if (!hovering) shimmerActiveRef.current = false;
      }
      const bar = shimmerBarRef.current;
      if (bar) {
        bar.setAttribute("x", String(shimmerXRef.current));
        bar.setAttribute("opacity", String(so));
        bar.setAttribute("transform", "skewX(-12)");
      }
    }

    // ── SVG Lens Flare (inside logo) ──
    if (flareGlowRef.current) {
      flareGlowRef.current.setAttribute("cx", String(sx));
      flareGlowRef.current.setAttribute("cy", String(sy));
      flareGlowRef.current.setAttribute("opacity", String(fo * 0.5));
    }
    if (flareCoreRef.current) {
      flareCoreRef.current.setAttribute("cx", String(sx));
      flareCoreRef.current.setAttribute("cy", String(sy));
      flareCoreRef.current.setAttribute("opacity", String(fo * 0.7));
    }
    if (flareStreakRef.current) {
      flareStreakRef.current.setAttribute("x", String(sx - 1750));
      flareStreakRef.current.setAttribute("y", String(sy - 20));
      flareStreakRef.current.setAttribute("opacity", String(fo * 0.6));
    }
    if (flareStreakWideRef.current) {
      flareStreakWideRef.current.setAttribute("x", String(sx - 2500));
      flareStreakWideRef.current.setAttribute("y", String(sy - 8));
      flareStreakWideRef.current.setAttribute("opacity", String(fo * 0.4));
    }

    // Ghost rings — mirrored offsets from center
    const dx = sx - CX;
    const dy = sy - CY;

    if (ghostRing1Ref.current) {
      ghostRing1Ref.current.setAttribute("cx", String(CX - dx * 0.4));
      ghostRing1Ref.current.setAttribute("cy", String(CY - dy * 0.4));
      ghostRing1Ref.current.setAttribute("opacity", String(fo * 0.4));
    }
    if (ghostRing2Ref.current) {
      ghostRing2Ref.current.setAttribute("cx", String(CX - dx * 0.7));
      ghostRing2Ref.current.setAttribute("cy", String(CY - dy * 0.7));
      ghostRing2Ref.current.setAttribute("opacity", String(fo * 0.3));
    }
    if (ghostRing3Ref.current) {
      ghostRing3Ref.current.setAttribute("cx", String(CX - dx * 0.2));
      ghostRing3Ref.current.setAttribute("cy", String(CY - dy * 0.2));
      ghostRing3Ref.current.setAttribute("opacity", String(fo * 0.2));
    }

    // Chromatic aberration — slight offsets from core
    if (chromaRRef.current) {
      chromaRRef.current.setAttribute("cx", String(sx + 80));
      chromaRRef.current.setAttribute("cy", String(sy - 40));
      chromaRRef.current.setAttribute("opacity", String(fo * 0.5));
    }
    if (chromaGRef.current) {
      chromaGRef.current.setAttribute("cx", String(sx - 60));
      chromaGRef.current.setAttribute("cy", String(sy + 50));
      chromaGRef.current.setAttribute("opacity", String(fo * 0.4));
    }
    if (chromaBRef.current) {
      chromaBRef.current.setAttribute("cx", String(sx + 30));
      chromaBRef.current.setAttribute("cy", String(sy + 70));
      chromaBRef.current.setAttribute("opacity", String(fo * 0.5));
    }

    // Hexagonal bokeh — scattered around
    if (hex1Ref.current) {
      hex1Ref.current.setAttribute("transform", `translate(${CX - dx * 0.5}, ${CY - dy * 0.3})`);
      hex1Ref.current.setAttribute("opacity", String(fo * 0.35));
    }
    if (hex2Ref.current) {
      hex2Ref.current.setAttribute("transform", `translate(${CX - dx * 0.8}, ${CY - dy * 0.6})`);
      hex2Ref.current.setAttribute("opacity", String(fo * 0.25));
    }
    if (hex3Ref.current) {
      hex3Ref.current.setAttribute("transform", `translate(${CX + dx * 0.3}, ${CY + dy * 0.2})`);
      hex3Ref.current.setAttribute("opacity", String(fo * 0.3));
    }

    // Continue animation if any effect is still visible
    if (so > 0.001 || fo > 0.001 || hovering) {
      rafRef.current = requestAnimationFrame(animate);
    } else {
      rafRef.current = 0;
    }
  }, []);

  const startAnimation = useCallback(() => {
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(animate);
    }
  }, [animate]);

  const handleMouseEnter = useCallback(() => {
    hoveringRef.current = true;
    shimmerActiveRef.current = true;
    shimmerXRef.current = -2000;
    startAnimation();
  }, [startAnimation]);

  const handleMouseLeave = useCallback(() => {
    hoveringRef.current = false;
    // Animation loop continues until effects fade out
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      mouseXRef.current = e.clientX;
      mouseYRef.current = e.clientY;
      const s = toSvg(e.clientX, e.clientY);
      targetSvgXRef.current = s.x;
      targetSvgYRef.current = s.y;
    },
    [toSvg]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <span
      ref={sceneRef}
      className={cn(
        "relative inline-flex items-center cursor-pointer transition-transform duration-500 ease-[cubic-bezier(0.165,0.84,0.44,1)] hover:scale-110",
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-6 w-auto"
        aria-label="Dash Studios"
        role="img"
      >
        <defs>
          {/* White → Gray gradient */}
          <linearGradient id="ds-base-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="25%" stopColor="#e8e8e8" />
            <stop offset="50%" stopColor="#f5f5f5" />
            <stop offset="75%" stopColor="#c0c0c0" />
            <stop offset="100%" stopColor="#d8d8d8" />
          </linearGradient>

          {/* RED shimmer gradient */}
          <linearGradient id="ds-shimmer-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,0,0,0)" />
            <stop offset="30%" stopColor="rgba(255,0,0,0)" />
            <stop offset="40%" stopColor="rgba(255,40,40,0.08)" />
            <stop offset="46%" stopColor="rgba(255,60,60,0.25)" />
            <stop offset="50%" stopColor="rgba(255,80,60,0.55)" />
            <stop offset="54%" stopColor="rgba(255,60,60,0.25)" />
            <stop offset="60%" stopColor="rgba(255,40,40,0.08)" />
            <stop offset="70%" stopColor="rgba(255,0,0,0)" />
            <stop offset="100%" stopColor="rgba(255,0,0,0)" />
          </linearGradient>

          {/* Lens flare gradients */}
          <radialGradient id="ds-flare-core-grad">
            <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
            <stop offset="25%" stopColor="rgba(230,240,255,0.5)" />
            <stop offset="55%" stopColor="rgba(180,210,255,0.15)" />
            <stop offset="100%" stopColor="rgba(150,190,255,0)" />
          </radialGradient>

          <linearGradient id="ds-flare-streak-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(140,180,255,0)" />
            <stop offset="15%" stopColor="rgba(140,180,255,0.08)" />
            <stop offset="40%" stopColor="rgba(180,210,255,0.3)" />
            <stop offset="50%" stopColor="rgba(220,235,255,0.6)" />
            <stop offset="60%" stopColor="rgba(180,210,255,0.3)" />
            <stop offset="85%" stopColor="rgba(140,180,255,0.08)" />
            <stop offset="100%" stopColor="rgba(140,180,255,0)" />
          </linearGradient>

          <linearGradient id="ds-flare-streak-wide-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(100,150,255,0)" />
            <stop offset="20%" stopColor="rgba(100,150,255,0.04)" />
            <stop offset="50%" stopColor="rgba(140,180,255,0.15)" />
            <stop offset="80%" stopColor="rgba(100,150,255,0.04)" />
            <stop offset="100%" stopColor="rgba(100,150,255,0)" />
          </linearGradient>

          {/* Clip path = logo shape */}
          <clipPath id="ds-logo-clip">
            {PATHS.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </clipPath>
        </defs>

        {/* ═══ Base logo paths ═══ */}
        <g fill="url(#ds-base-grad)">
          {PATHS.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>

        {/* ═══ ALL EFFECTS — clipped inside logo ═══ */}
        <g clipPath="url(#ds-logo-clip)">
          {/* RED shimmer bar */}
          <rect
            ref={shimmerBarRef}
            x="-2000"
            y="0"
            width="1800"
            height="3072"
            fill="url(#ds-shimmer-grad)"
            opacity="0"
          />

          {/* Lens flare core glow */}
          <circle
            ref={flareGlowRef}
            cx={CX}
            cy={CY}
            r="600"
            fill="url(#ds-flare-core-grad)"
            opacity="0"
          />

          {/* Anamorphic horizontal streak (main) */}
          <rect
            ref={flareStreakRef}
            x="0"
            y="1520"
            width="3500"
            height="40"
            fill="url(#ds-flare-streak-grad)"
            opacity="0"
            rx="20"
          />

          {/* Anamorphic wide subtle streak */}
          <rect
            ref={flareStreakWideRef}
            x="0"
            y="1528"
            width="5000"
            height="16"
            fill="url(#ds-flare-streak-wide-grad)"
            opacity="0"
            rx="8"
          />

          {/* Bright core dot */}
          <circle
            ref={flareCoreRef}
            cx={CX}
            cy={CY}
            r="80"
            fill="white"
            opacity="0"
          />

          {/* Ghost ring reflections */}
          <circle
            ref={ghostRing1Ref}
            cx={CX}
            cy={CY}
            r="250"
            fill="none"
            stroke="rgba(140,180,255,0.15)"
            strokeWidth="6"
            opacity="0"
          />
          <circle
            ref={ghostRing2Ref}
            cx={CX}
            cy={CY}
            r="140"
            fill="none"
            stroke="rgba(255,200,140,0.1)"
            strokeWidth="4"
            opacity="0"
          />
          <circle
            ref={ghostRing3Ref}
            cx={CX}
            cy={CY}
            r="380"
            fill="none"
            stroke="rgba(140,255,200,0.06)"
            strokeWidth="5"
            opacity="0"
          />

          {/* Chromatic aberration dots */}
          <circle ref={chromaRRef} cx={CX} cy={CY} r="40" fill="rgba(255,100,80,0.2)" opacity="0" />
          <circle ref={chromaGRef} cx={CX} cy={CY} r="30" fill="rgba(80,255,120,0.15)" opacity="0" />
          <circle ref={chromaBRef} cx={CX} cy={CY} r="50" fill="rgba(80,140,255,0.2)" opacity="0" />

          {/* Hexagonal bokeh shapes */}
          <polygon
            ref={hex1Ref}
            points="0,-60 52,-30 52,30 0,60 -52,30 -52,-30"
            fill="rgba(180,210,255,0.08)"
            opacity="0"
          />
          <polygon
            ref={hex2Ref}
            points="0,-40 35,-20 35,20 0,40 -35,20 -35,-20"
            fill="rgba(200,220,255,0.06)"
            opacity="0"
          />
          <polygon
            ref={hex3Ref}
            points="0,-50 43,-25 43,25 0,50 -43,25 -43,-25"
            fill="rgba(160,200,255,0.07)"
            opacity="0"
          />
        </g>
      </svg>
    </span>
  );
}
