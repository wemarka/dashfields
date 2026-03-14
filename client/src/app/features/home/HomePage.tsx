/**
 * HomePage — Creative hub landing page.
 *
 * ── Brand Palette (ONLY these values allowed) ──────────────────────────────
 *  Background:  #433F3A  (neutral-950)
 *  Card bg:     #56524C  (neutral-900)
 *  Border:      #6b6660  (neutral-800)
 *  Text dim:    #737373  (neutral-500)
 *  Text muted:  #b8b8b8  (neutral-400)
 *  Text bright: #ffffff  (white)
 *  Brand red:   #ef3735
 *  Gradient:    #ef3735 → #ffffff  (red to white, never orange/blue)
 * ──────────────────────────────────────────────────────────────────────────
 */
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/shared/hooks/useAuth";
import { trpc } from "@/core/lib/trpc";

// ─── Scroll Reveal Hook ──────────────────────────────────────────────────────
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".sr-reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add("sr-visible");
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

// ─── Tool Card Data ──────────────────────────────────────────────────────────
const CREATE_TOOLS = [
  {
    id: "assist",
    label: "AI Assist",
    description: "Chat with your AI marketing co-pilot",
    path: "/assist",
    badge: null,
    img: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=400&q=80",
  },
  {
    id: "campaign",
    label: "Create Campaign",
    description: "Launch ads across all platforms at once",
    path: "/campaign-wizard",
    badge: "NEW",
    img: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&q=80",
  },
  {
    id: "studios",
    label: "Dash Studios",
    description: "Generate images, videos & creatives",
    path: "/studios",
    badge: "HOT",
    img: "https://images.unsplash.com/photo-1536240478700-b869070f9279?w=400&q=80",
  },
  {
    id: "analytics",
    label: "Analytics",
    description: "Deep insights on every campaign",
    path: "/analytics/overview",
    badge: null,
    img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80",
  },
  {
    id: "content",
    label: "Content Planner",
    description: "Schedule and publish across channels",
    path: "/content/planner",
    badge: null,
    img: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&q=80",
  },
];

// ─── What's New — static changelog ──────────────────────────────────────────
const NEWS_ITEMS = [
  {
    id: 1,
    tag: "Feature",
    title: "AI Assist 2.0 — Generative UI & Rich Responses",
    excerpt:
      "Your marketing co-pilot now generates live campaign previews, charts, and actionable insights directly inside the chat.",
    date: "Mar 14, 2026",
    category: "Product Update",
    img: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&q=80",
  },
  {
    id: 2,
    tag: "Update",
    title: "Dash Studios — Video Generation with Kling 2.5",
    excerpt:
      "Create cinematic ad videos from a single text prompt. Powered by Kling 2.5 Turbo for ultra-realistic motion.",
    date: "Mar 10, 2026",
    category: "Model Release",
    img: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80",
  },
  {
    id: 3,
    tag: "Update",
    title: "Multi-Platform Campaign Wizard — Now with TikTok",
    excerpt:
      "Launch campaigns across Facebook, Instagram, TikTok, and LinkedIn simultaneously with one unified workflow.",
    date: "Mar 5, 2026",
    category: "Platform Update",
    img: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&q=80",
  },
  {
    id: 4,
    tag: "Feature",
    title: "Smart Budget Optimizer — AI-Powered Spend Allocation",
    excerpt:
      "Let the AI redistribute your ad budget in real-time based on live performance signals across all connected accounts.",
    date: "Feb 28, 2026",
    category: "AI Feature",
    img: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── Palette constants (single source of truth) ──────────────────────────────
const P = {
  bg:        "#171717",   // app base bg
  card:      "#262626",   // card/surface bg
  border:    "#333333",   // border
  dim:       "#737373",   // neutral-500
  muted:     "#C8C8C8",   // neutral-400
  white:     "#ffffff",
  red:       "#ef3735",
  redAlpha8: "rgba(230,32,32,.08)",
  redAlpha12:"rgba(230,32,32,.12)",
  redAlpha18:"rgba(230,32,32,.18)",
  redAlpha25:"rgba(230,32,32,.25)",
} as const;

// ─── Main Component ──────────────────────────────────────────────────────────
export default function HomePage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  useScrollReveal();

  const firstName = user?.name?.split(" ")[0] ?? "there";

  const { data: snapshot } = trpc.homeStats.quickSnapshot.useQuery(undefined, { staleTime: 60_000 });
  const { data: creations } = trpc.homeStats.recentCreations.useQuery(undefined, { staleTime: 60_000 });

  const bannerStats = [
    { label: "Campaigns",   val: snapshot ? String(snapshot.activeCampaigns)          : "—", sub: "Active" },
    { label: "Impressions", val: snapshot ? fmtNumber(snapshot.totalImpressions)       : "—", sub: "Total" },
    { label: "Click Rate",  val: snapshot ? `${snapshot.clickRate}%`                   : "—", sub: "Avg CTR" },
  ];

  return (
    <>
      <style>{`
        /* ── Scroll reveal ── */
        .sr-reveal {
          opacity: 0;
          transform: translateY(36px);
          transition: opacity 700ms cubic-bezier(.19,1,.22,1),
                      transform 700ms cubic-bezier(.19,1,.22,1);
        }
        .sr-reveal.sr-visible { opacity: 1; transform: translateY(0); }
        .sr-d1 { transition-delay:   0ms; }
        .sr-d2 { transition-delay:  80ms; }
        .sr-d3 { transition-delay: 160ms; }
        .sr-d4 { transition-delay: 240ms; }
        .sr-d5 { transition-delay: 320ms; }
        .sr-d6 { transition-delay: 400ms; }

        /* ── Pulsing dot ── */
        @keyframes pulse-dot {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:.4; transform:scale(.7); }
        }
        .pulse-dot { animation: pulse-dot 2s ease infinite; }

        /* ── Card shimmer ── */
        @keyframes shimmer-sweep { to { left: 130%; } }
        .shimmer-host { position:relative; overflow:hidden; }
        .shimmer-host::before {
          content:'';
          position:absolute; top:0; left:-100%; width:60%; height:100%;
          background: linear-gradient(105deg,
            transparent 30%,
            rgba(255,255,255,.04) 45%,
            rgba(255,255,255,.09) 50%,
            rgba(255,255,255,.04) 55%,
            transparent 70%);
          transform: skewX(-15deg);
          z-index:2;
        }
        .shimmer-host:hover::before { animation: shimmer-sweep .8s ease forwards; }

        /* ── Gradient text: brand-red → white ── */
        .gradient-text {
          background: linear-gradient(135deg, #ef3735 0%, #ffffff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* ── Tool card hover ── */
        .tool-card {
          transition: transform 300ms cubic-bezier(.165,.84,.44,1),
                      border-color 300ms ease, box-shadow 300ms ease;
        }
        .tool-card:hover {
          transform: translateY(-6px) scale(1.02);
          border-color: rgba(230,32,32,.25) !important;
          box-shadow: 0 16px 48px rgba(0,0,0,.6), 0 0 0 1px rgba(230,32,32,.1);
        }
        .tool-card:hover .arrow-icon { color: #ef3735 !important; transform: translateX(4px); }
        .arrow-icon { transition: color 200ms ease, transform 200ms cubic-bezier(.165,.84,.44,1); }

        /* ── News card hover ── */
        .news-card {
          transition: transform 300ms cubic-bezier(.165,.84,.44,1),
                      border-color 300ms ease, box-shadow 300ms ease;
        }
        .news-card:hover {
          transform: translateY(-5px);
          border-color: rgba(230,32,32,.18) !important;
          box-shadow: 0 20px 60px rgba(0,0,0,.6);
        }

        /* ── Creation card hover ── */
        .creation-card {
          transition: transform 300ms cubic-bezier(.165,.84,.44,1),
                      border-color 300ms ease, box-shadow 300ms ease;
        }
        .creation-card:hover {
          transform: scale(1.03);
          border-color: rgba(230,32,32,.18) !important;
          box-shadow: 0 16px 48px rgba(0,0,0,.6);
          z-index: 2;
        }
        .creation-card:hover .play-btn {
          opacity: 1 !important;
          transform: translate(-50%,-50%) scale(1) !important;
        }

        /* ── Browse btn ── */
        .browse-btn {
          transition: color 200ms ease, border-color 200ms ease, background 200ms ease;
        }
        .browse-btn:hover {
          color: #ffffff !important;
          border-color: #404040 !important;
          background: rgba(255,255,255,.03) !important;
        }

        /* ── Gradient divider ── */
        .gradient-divider {
          height: 1px;
          background: linear-gradient(90deg,
            transparent,
            #6b6660 20%,
            #ef3735 50%,
            #6b6660 80%,
            transparent);
          opacity: .35;
          margin: 0 60px;
        }

        /* ── Hero Banner animations ── */
        @keyframes banner-float {
          0%,100% { transform: scale(1.03) translateY(0px); }
          50%      { transform: scale(1.06) translateY(-8px); }
        }
        @keyframes banner-fade-in   { from { opacity:0; transform:translateY(20px); }  to { opacity:1; transform:translateY(0); } }
        @keyframes banner-slide-right { from { opacity:0; transform:translateX(-30px); } to { opacity:1; transform:translateX(0); } }
        @keyframes banner-slide-up  { from { opacity:0; transform:translateY(24px); }  to { opacity:1; transform:translateY(0); } }

        .banner-bg-img { animation: banner-float 8s ease-in-out infinite; }
        .banner-badge  { animation: banner-fade-in    600ms       ease forwards; opacity:0; }
        .banner-title  { animation: banner-slide-right 700ms 100ms ease forwards; opacity:0; }
        .banner-sub    { animation: banner-slide-up   700ms 200ms ease forwards; opacity:0; }
        .banner-cta    { animation: banner-slide-up   700ms 350ms ease forwards; opacity:0; }

        .banner-cta-btn {
          transition: transform 250ms ease, box-shadow 250ms ease, background 250ms ease;
        }
        .banner-cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(230,32,32,.45);
          background: #c41a1a !important;
        }
        .banner-secondary-btn {
          transition: border-color 200ms ease, color 200ms ease, background 200ms ease;
        }
        .banner-secondary-btn:hover {
          border-color: rgba(255,255,255,.35) !important;
          background: rgba(255,255,255,.06) !important;
          color: #ffffff !important;
        }
      `}</style>

      {/* ══════ HERO BANNER ══════ */}
      <section
        style={{
          margin: "28px 60px 0",
          borderRadius: 18,
          overflow: "hidden",
          position: "relative",
          height: 260,
          background: P.bg,
          border: `1px solid ${P.border}`,
          cursor: "pointer",
        }}
        onClick={() => setLocation("/studios")}
      >
        {/* Floating background image */}
        <div
          className="banner-bg-img"
          style={{
            position: "absolute", inset: 0,
            backgroundImage: "url('https://images.unsplash.com/photo-1536240478700-b869070f9279?w=1400&q=85')",
            backgroundSize: "cover", backgroundPosition: "center 30%",
            transformOrigin: "center",
          }}
        />
        {/* Dark gradient overlay */}
        <div
          style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(105deg, rgba(0,0,0,.90) 0%, rgba(0,0,0,.70) 40%, rgba(0,0,0,.25) 70%, transparent 100%)",
          }}
        />
        {/* Brand-red glow — top-left only */}
        <div
          aria-hidden
          style={{
            position: "absolute", top: "-40%", left: "-10%",
            width: 500, height: 500, pointerEvents: "none",
            background: `radial-gradient(circle, ${P.redAlpha12} 0%, transparent 65%)`,
          }}
        />

        {/* Text content */}
        <div
          style={{
            position: "relative", zIndex: 2,
            padding: "36px 48px",
            height: "100%",
            display: "flex", flexDirection: "column", justifyContent: "center",
            maxWidth: 620,
          }}
        >
          <div
            className="banner-badge"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "#ef3735", color: P.white,
              fontSize: 10, fontWeight: 700,
              letterSpacing: "1.5px", textTransform: "uppercase",
              padding: "4px 12px", borderRadius: 4,
              marginBottom: 16, width: "fit-content",
            }}
          >
            ✦ NEW IN DASH STUDIOS
          </div>
          <h2
            className="banner-title"
            style={{
              fontWeight: 800,
              fontSize: "clamp(26px, 3vw, 40px)",
              lineHeight: 1.1,
              letterSpacing: "-1px",
              color: P.white,
              marginBottom: 10,
            }}
          >
            AI Video Generation<br />
            <span style={{ color: P.red }}>Powered by Kling 2.5</span>
          </h2>
          <p
            className="banner-sub"
            style={{
              fontSize: 14, color: P.muted,
              lineHeight: 1.55, marginBottom: 22, fontWeight: 300,
            }}
          >
            Create cinematic ad videos from a single text prompt. Ultra-realistic motion, one click.
          </p>
          <div className="banner-cta" style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button
              className="banner-cta-btn"
              style={{
                background: "#ef3735", color: P.white,
                border: "none", borderRadius: 8,
                padding: "10px 22px", fontSize: 14, fontWeight: 600,
                cursor: "pointer",
              }}
              onClick={(e) => { e.stopPropagation(); setLocation("/studios"); }}
            >
              Try Dash Studios →
            </button>
            <button
              className="banner-secondary-btn"
              style={{
                background: "transparent",
                color: P.muted,
                border: `1px solid rgba(255,255,255,.15)`,
                borderRadius: 8,
                padding: "10px 22px", fontSize: 14, fontWeight: 500,
                cursor: "pointer",
              }}
              onClick={(e) => { e.stopPropagation(); setLocation("/assist"); }}
            >
              Ask AI Assist
            </button>
          </div>
        </div>

        {/* Real stats cards */}
        <div
          style={{
            position: "absolute", right: 48, top: "50%",
            transform: "translateY(-50%)",
            display: "flex", gap: 12, alignItems: "center",
            zIndex: 2,
          }}
        >
          {bannerStats.map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "rgba(10,10,10,.80)",
                backdropFilter: "blur(16px)",
                border: `1px solid ${P.border}`,
                borderRadius: 12,
                padding: "14px 20px",
                textAlign: "center",
                minWidth: 90,
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 800, color: P.white, lineHeight: 1 }}>
                {stat.val}
              </div>
              <div style={{ fontSize: 11, color: P.dim, marginTop: 4 }}>{stat.sub}</div>
              <div style={{ fontSize: 10, color: "#ef3735", fontWeight: 600, marginTop: 2, letterSpacing: "0.5px" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════ HERO — What would you create today? ══════ */}
      <section
        className="relative overflow-hidden"
        style={{
          padding: "72px 60px 80px",
          minHeight: "90vh",
          display: "flex", flexDirection: "column", justifyContent: "center",
        }}
      >
        {/* Brand-red glow blobs — no blue anywhere */}
        <div
          aria-hidden
          style={{
            position: "absolute", top: "-20%", right: "-10%",
            width: 800, height: 800, pointerEvents: "none",
            background: `radial-gradient(circle, ${P.redAlpha8} 0%, transparent 60%)`,
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute", bottom: "-30%", left: "-15%",
            width: 700, height: 700, pointerEvents: "none",
            background: `radial-gradient(circle, rgba(230,32,32,.04) 0%, transparent 60%)`,
          }}
        />

        {/* Label pill */}
        <div
          className="sr-reveal sr-d1"
            style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: P.redAlpha8, border: `1px solid ${P.redAlpha18}`,
                color: "#ef3735", fontSize: 12, fontWeight: 600,
            letterSpacing: "1.5px", textTransform: "uppercase",
            padding: "6px 16px", borderRadius: 50,
            marginBottom: 28, width: "fit-content",
          }}
        >
          <span
            className="pulse-dot"
            style={{ width: 6, height: 6, background: P.red, borderRadius: "50%", display: "inline-block" }}
          />
          Explore All Tools
        </div>

        {/* Headline */}
        <h1
          className="sr-reveal sr-d2"
          style={{
            fontWeight: 800,
            fontSize: "clamp(48px, 6vw, 82px)",
            lineHeight: 1.05,
            letterSpacing: "-2px",
            marginBottom: 24,
            maxWidth: 800,
            color: P.white,
          }}
        >
          Hello, {firstName}.<br />
          <span className="gradient-text">What would you create today?</span>
        </h1>

        {/* Sub */}
        <p
          className="sr-reveal sr-d3"
          style={{
            fontSize: 17, color: P.muted, maxWidth: 520,
            lineHeight: 1.6, marginBottom: 52, fontWeight: 300,
          }}
        >
          Your AI-powered marketing workspace. Create campaigns, generate visuals,
          analyze performance — all in one place.
        </p>

        {/* Tool Cards Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            maxWidth: 1100,
          }}
        >
          {CREATE_TOOLS.map((tool, i) => (
            <div
              key={tool.id}
              className={`tool-card shimmer-host sr-reveal sr-d${Math.min(i + 2, 6)}`}
              onClick={() => setLocation(tool.path)}
              style={{
                background: P.card,
                border: `1px solid ${P.border}`,
                borderRadius: 14,
                overflow: "hidden",
                cursor: "pointer",
                position: "relative",
              }}
            >
              {/* Badge */}
              {tool.badge && (
                <div
                  style={{
                    position: "absolute", top: 12, right: 12, zIndex: 5,
                    background: P.red,
                    color: P.white, fontSize: 10, fontWeight: 700,
                    padding: "3px 8px", borderRadius: 4,
                    letterSpacing: "0.5px", textTransform: "uppercase",
                  }}
                >
                  {tool.badge}
                </div>
              )}
              {/* Image */}
              <div
                style={{
                  width: "100%", height: 160,
                  backgroundImage: `url('${tool.img}')`,
                  backgroundSize: "cover", backgroundPosition: "center",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute", inset: 0,
                    background: `linear-gradient(to top, ${P.card} 0%, transparent 60%)`,
                  }}
                />
              </div>
              {/* Body */}
              <div style={{ padding: "16px 18px 18px" }}>
                <div
                  style={{
                    fontWeight: 700, fontSize: 15, marginBottom: 4,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    color: P.white,
                  }}
                >
                  {tool.label}
                  <span className="arrow-icon" style={{ fontSize: 18, color: P.dim }}>→</span>
                </div>
                <div style={{ fontSize: 12.5, color: P.dim, lineHeight: 1.45 }}>
                  {tool.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Gradient divider */}
      <div className="gradient-divider" />

      {/* ══════ WHAT'S NEW ══════ */}
      <section style={{ padding: "80px 60px" }}>
        <div
          className="sr-reveal"
          style={{
            display: "flex", alignItems: "flex-end",
            justifyContent: "space-between", marginBottom: 40,
          }}
        >
          <h2
            style={{
              fontWeight: 800,
              fontSize: "clamp(32px, 4vw, 48px)",
              letterSpacing: "-1px",
              lineHeight: 1.1,
              color: P.white,
            }}
          >
            What's <span style={{ color: P.red }}>New</span>
          </h2>
          <button
            className="browse-btn"
            onClick={() => setLocation("/analytics/reports")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              color: P.dim, background: "transparent",
              border: `1px solid ${P.border}`, borderRadius: 50,
              padding: "8px 18px", fontSize: 14, fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Browse all →
          </button>
        </div>

        {/* Horizontal scroll */}
        <div
          style={{
            display: "flex", gap: 20,
            overflowX: "auto", paddingBottom: 16,
            scrollSnapType: "x mandatory",
            msOverflowStyle: "none", scrollbarWidth: "none",
          }}
        >
          {NEWS_ITEMS.map((item, i) => (
            <div
              key={item.id}
              className={`news-card shimmer-host sr-reveal sr-d${Math.min(i + 1, 6)}`}
              style={{
                minWidth: 380, maxWidth: 380,
                background: P.card, border: `1px solid ${P.border}`,
                borderRadius: 14, overflow: "hidden",
                scrollSnapAlign: "start", flexShrink: 0,
                cursor: "pointer",
              }}
            >
              {/* Image */}
              <div
                style={{
                  width: "100%", height: 210,
                  backgroundImage: `url('${item.img}')`,
                  backgroundSize: "cover", backgroundPosition: "center",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute", bottom: 0, left: 0, right: 0, height: 80,
                    background: `linear-gradient(to top, ${P.card}, transparent)`,
                  }}
                />
                {/* Tag — always brand-red */}
                <span
                  style={{
                    position: "absolute", top: 14, left: 14, zIndex: 2,
                    fontSize: 10, fontWeight: 700, letterSpacing: 1,
                    textTransform: "uppercase", padding: "4px 10px", borderRadius: 4,
                    background: P.red, color: P.white,
                  }}
                >
                  {item.tag}
                </span>
              </div>
              {/* Body */}
              <div style={{ padding: "18px 22px 22px" }}>
                <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8, lineHeight: 1.3, color: P.white }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 13, color: P.muted, lineHeight: 1.55, marginBottom: 14 }}>
                  {item.excerpt}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 12, color: P.dim }}>
                  <span>{item.date}</span>
                  <span style={{ color: P.border }}>•</span>
                  <span>{item.category}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Gradient divider */}
      <div className="gradient-divider" />

      {/* ══════ RECENT CREATIONS ══════ */}
      <section style={{ padding: "80px 60px 100px" }}>
        <div
          className="sr-reveal"
          style={{
            display: "flex", alignItems: "flex-end",
            justifyContent: "space-between", marginBottom: 40,
          }}
        >
          <h2
            style={{
              fontWeight: 800,
              fontSize: "clamp(32px, 4vw, 48px)",
              letterSpacing: "-1px",
              lineHeight: 1.1,
              color: P.white,
            }}
          >
            Recent <span style={{ color: P.red }}>Creations</span>
          </h2>
          <button
            className="browse-btn"
            onClick={() => setLocation("/studios")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              color: P.dim, background: "transparent",
              border: `1px solid ${P.border}`, borderRadius: 50,
              padding: "8px 18px", fontSize: 14, fontWeight: 500,
              cursor: "pointer",
            }}
          >
            View all →
          </button>
        </div>

        {creations && creations.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gridTemplateRows: "auto auto",
              gap: 16,
            }}
          >
            {creations.map((c, i) => (
              <div
                key={c.id}
                className={`creation-card shimmer-host sr-reveal sr-d${Math.min(i + 1, 6)}`}
                style={{
                  background: P.card, border: `1px solid ${P.border}`,
                  borderRadius: 14, overflow: "hidden",
                  cursor: "pointer", position: "relative",
                  gridColumn: i === 0 ? "span 2" : undefined,
                  gridRow:    i === 0 ? "span 2" : undefined,
                }}
              >
                <div
                  style={{
                    width: "100%", height: "100%",
                    minHeight: i === 0 ? 430 : 200,
                    backgroundImage: `url('${c.url}')`,
                    backgroundSize: "cover", backgroundPosition: "center",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute", inset: 0,
                      background: "linear-gradient(to top, rgba(10,10,10,.90) 0%, rgba(10,10,10,.10) 40%, transparent 60%)",
                    }}
                  />
                </div>

                {c.type === "video" && (
                  <div
                    className="play-btn"
                    style={{
                      position: "absolute", top: "50%", left: "50%",
                      transform: "translate(-50%,-50%) scale(.85)",
                      width: 52, height: 52,
                      background: "rgba(255,255,255,.12)",
                      backdropFilter: "blur(10px)",
                      borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      zIndex: 3, opacity: 0,
                      transition: "opacity 300ms ease, transform 300ms cubic-bezier(.165,.84,.44,1)",
                    }}
                  >
                    <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, fill: "white", marginLeft: 3 }}>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                )}

                <div
                  style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    padding: 20, zIndex: 2,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: i === 0 ? 22 : 15,
                      marginBottom: i === 0 ? 6 : 4,
                      color: P.white,
                    }}
                  >
                    {c.label}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: P.dim }}>
                    <div
                      style={{
                        width: 22, height: 22, borderRadius: "50%",
                        background: P.card,
                        border: `1px solid ${P.border}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 700, color: P.red,
                      }}
                    >
                      {user?.name?.[0]?.toUpperCase() ?? "A"}
                    </div>
                    <span>{c.type === "video" ? "Video" : "Image"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div
            className="sr-reveal"
            style={{
              background: P.card, border: `1px solid ${P.border}`,
              borderRadius: 14, padding: "60px 24px",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 14, textAlign: "center",
            }}
          >
            <div
              style={{
                width: 56, height: 56, borderRadius: "50%",
                background: P.redAlpha8,
                border: `1px solid ${P.redAlpha18}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <svg viewBox="0 0 24 24" style={{ width: 24, height: 24, fill: P.red }}>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: P.white }}>
              No creations yet
            </div>
            <div style={{ fontSize: 13, color: P.dim, maxWidth: 320 }}>
              Start by generating images or videos in Dash Studios, and they'll appear here.
            </div>
            <button
              onClick={() => setLocation("/studios")}
              style={{
                marginTop: 8,
                background: P.red, color: P.white,
                border: "none", borderRadius: 8,
                padding: "10px 24px", fontSize: 14, fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Open Dash Studios →
            </button>
          </div>
        )}
      </section>
    </>
  );
}
