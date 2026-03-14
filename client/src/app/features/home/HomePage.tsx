/**
 * HomePage — Creative hub landing page.
 * Faithful React port of the reference "Dash Studios Home" design.
 * Brand colors: #E62020 (brand-red) replaces #c8ff00 (lime accent).
 * Fonts: Syne (headings) + Inter (body).
 * Sections: Hero (What would you create today?) → What's New → Recent Creations
 */
import { useEffect, useRef } from "react";
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

// ─── What's New Data ─────────────────────────────────────────────────────────
const NEWS_ITEMS = [
  {
    id: 1,
    tag: "Feature",
    tagColor: "bg-[#e62020] text-white",
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
    tagColor: "bg-[#3b8eff] text-white",
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
    tagColor: "bg-[#3b8eff] text-white",
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
    tagColor: "bg-[#e62020] text-white",
    title: "Smart Budget Optimizer — AI-Powered Spend Allocation",
    excerpt:
      "Let the AI redistribute your ad budget in real-time based on live performance signals across all connected accounts.",
    date: "Feb 28, 2026",
    category: "AI Feature",
    img: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80",
  },
];

// ─── Recent Creations Data ───────────────────────────────────────────────────
const CREATIONS = [
  {
    id: 1,
    featured: true,
    title: "Summer Sale — TikTok Video Campaign",
    type: "video",
    author: "A",
    platform: "TikTok",
    views: "24.3K",
    img: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80",
  },
  {
    id: 2,
    featured: false,
    title: "Brand Awareness — Instagram Carousel",
    type: "image",
    author: "A",
    platform: "Instagram",
    views: "8.1K",
    img: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=400&q=80",
  },
  {
    id: 3,
    featured: false,
    title: "Product Launch — Facebook Ad",
    type: "image",
    author: "A",
    platform: "Facebook",
    views: "12.7K",
    img: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=400&q=80",
  },
  {
    id: 4,
    featured: false,
    title: "Retargeting — LinkedIn Sponsored",
    type: "image",
    author: "A",
    platform: "LinkedIn",
    views: "5.4K",
    img: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&q=80",
  },
  {
    id: 5,
    featured: false,
    title: "Flash Sale — Story Ad",
    type: "video",
    author: "A",
    platform: "Instagram",
    views: "19.2K",
    img: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400&q=80",
  },
];

// ─── Main Component ──────────────────────────────────────────────────────────
export default function HomePage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  useScrollReveal();

  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <>
      {/* ── Inline styles for Syne font + animations ── */}
      <style>{`
        .syne { font-family: 'Syne', sans-serif; }

        /* Scroll reveal */
        .sr-reveal {
          opacity: 0;
          transform: translateY(36px);
          transition: opacity 700ms cubic-bezier(.19,1,.22,1),
                      transform 700ms cubic-bezier(.19,1,.22,1);
        }
        .sr-reveal.sr-visible { opacity: 1; transform: translateY(0); }
        .sr-d1 { transition-delay: 0ms; }
        .sr-d2 { transition-delay: 80ms; }
        .sr-d3 { transition-delay: 160ms; }
        .sr-d4 { transition-delay: 240ms; }
        .sr-d5 { transition-delay: 320ms; }
        .sr-d6 { transition-delay: 400ms; }

        /* Pulsing dot */
        @keyframes pulse-dot {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:.4; transform:scale(.7); }
        }
        .pulse-dot { animation: pulse-dot 2s ease infinite; }

        /* Card shimmer sweep */
        @keyframes shimmer-sweep { to { left: 130%; } }
        .shimmer-host { position:relative; overflow:hidden; }
        .shimmer-host::before {
          content:'';
          position:absolute; top:0; left:-100%; width:60%; height:100%;
          background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,.06) 45%, rgba(255,255,255,.13) 50%, rgba(255,255,255,.06) 55%, transparent 70%);
          transform: skewX(-15deg);
          z-index:2;
        }
        .shimmer-host:hover::before { animation: shimmer-sweep .8s ease forwards; }

        /* Gradient text */
        .gradient-text {
          background: linear-gradient(135deg, #e62020 0%, #ff6b35 50%, #e62020 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Tool card hover */
        .tool-card {
          transition: transform 300ms cubic-bezier(.165,.84,.44,1),
                      border-color 300ms ease,
                      box-shadow 300ms ease;
        }
        .tool-card:hover {
          transform: translateY(-6px) scale(1.02);
          border-color: rgba(230,32,32,.25) !important;
          box-shadow: 0 16px 48px rgba(0,0,0,.5), 0 0 0 1px rgba(230,32,32,.1);
        }
        .tool-card:hover .arrow-icon {
          color: #e62020 !important;
          transform: translateX(4px);
        }
        .arrow-icon { transition: color 200ms ease, transform 200ms cubic-bezier(.165,.84,.44,1); }

        /* News card hover */
        .news-card {
          transition: transform 300ms cubic-bezier(.165,.84,.44,1),
                      border-color 300ms ease,
                      box-shadow 300ms ease;
        }
        .news-card:hover {
          transform: translateY(-5px);
          border-color: rgba(230,32,32,.18) !important;
          box-shadow: 0 20px 60px rgba(0,0,0,.55);
        }

        /* Creation card hover */
        .creation-card {
          transition: transform 300ms cubic-bezier(.165,.84,.44,1),
                      border-color 300ms ease,
                      box-shadow 300ms ease;
        }
        .creation-card:hover {
          transform: scale(1.03);
          border-color: rgba(230,32,32,.18) !important;
          box-shadow: 0 16px 48px rgba(0,0,0,.55);
          z-index: 2;
        }
        .creation-card:hover .play-btn {
          opacity: 1 !important;
          transform: translate(-50%,-50%) scale(1) !important;
        }

        /* Browse btn */
        .browse-btn {
          transition: color 200ms ease, border-color 200ms ease, background 200ms ease;
        }
        .browse-btn:hover {
          color: #e8eaed !important;
          border-color: #555d68 !important;
          background: rgba(255,255,255,.03) !important;
        }

        /* Gradient divider */
        .gradient-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, #222830 20%, #e62020 50%, #222830 80%, transparent);
          opacity: .35;
          margin: 0 60px;
        }

        /* Noise overlay */
        .noise-overlay {
          position: fixed; inset: 0; pointer-events: none; z-index: 9999;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E");
        }
      `}</style>

      {/* Noise overlay */}
      <div className="noise-overlay" aria-hidden />

      {/* ══════ HERO ══════ */}
      <section
        className="relative overflow-hidden"
        style={{ padding: "72px 60px 80px", minHeight: "90vh", display: "flex", flexDirection: "column", justifyContent: "center" }}
      >
        {/* Glow blobs */}
        <div
          aria-hidden
          style={{
            position: "absolute", top: "-20%", right: "-10%",
            width: 800, height: 800, pointerEvents: "none",
            background: "radial-gradient(circle, rgba(230,32,32,.07) 0%, transparent 60%)",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute", bottom: "-30%", left: "-15%",
            width: 700, height: 700, pointerEvents: "none",
            background: "radial-gradient(circle, rgba(59,142,255,.04) 0%, transparent 60%)",
          }}
        />

        {/* Label */}
        <div
          className="sr-reveal sr-d1"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(230,32,32,.08)", border: "1px solid rgba(230,32,32,.18)",
            color: "#e62020", fontSize: 12, fontWeight: 600,
            letterSpacing: "1.5px", textTransform: "uppercase",
            padding: "6px 16px", borderRadius: 50, marginBottom: 28, width: "fit-content",
          }}
        >
          <span
            className="pulse-dot"
            style={{ width: 6, height: 6, background: "#e62020", borderRadius: "50%", display: "inline-block" }}
          />
          Explore All Tools
        </div>

        {/* Headline */}
        <h1
          className="syne sr-reveal sr-d2"
          style={{
            fontWeight: 800,
            fontSize: "clamp(48px, 6vw, 82px)",
            lineHeight: 1.05,
            letterSpacing: "-2px",
            marginBottom: 24,
            maxWidth: 800,
            color: "#e8eaed",
          }}
        >
          Hello, {firstName}.<br />
          <span className="gradient-text">What would you create today?</span>
        </h1>

        {/* Sub */}
        <p
          className="sr-reveal sr-d3"
          style={{
            fontSize: 17, color: "#8a919a", maxWidth: 520,
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
                background: "#131619",
                border: "1px solid #222830",
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
                    background: tool.badge === "HOT" ? "#e62020" : "#e62020",
                    color: "#fff", fontSize: 10, fontWeight: 700,
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
                    background: "linear-gradient(to top, #131619 0%, transparent 60%)",
                  }}
                />
              </div>
              {/* Body */}
              <div style={{ padding: "16px 18px 18px" }}>
                <div
                  className="syne"
                  style={{
                    fontWeight: 700, fontSize: 15, marginBottom: 4,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    color: "#e8eaed",
                  }}
                >
                  {tool.label}
                  <span className="arrow-icon" style={{ fontSize: 18, color: "#555d68" }}>→</span>
                </div>
                <div style={{ fontSize: 12.5, color: "#555d68", lineHeight: 1.45 }}>
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
        {/* Header */}
        <div
          className="sr-reveal"
          style={{
            display: "flex", alignItems: "flex-end",
            justifyContent: "space-between", marginBottom: 40,
          }}
        >
          <h2
            className="syne"
            style={{
              fontWeight: 800,
              fontSize: "clamp(32px, 4vw, 48px)",
              letterSpacing: "-1px",
              lineHeight: 1.1,
              color: "#e8eaed",
            }}
          >
            What's <span style={{ color: "#e62020" }}>New</span>
          </h2>
          <button
            className="browse-btn"
            onClick={() => setLocation("/analytics/reports")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              color: "#8a919a", background: "transparent",
              border: "1px solid #222830", borderRadius: 50,
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
                background: "#131619", border: "1px solid #222830",
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
                    background: "linear-gradient(to top, #131619, transparent)",
                  }}
                />
                <span
                  style={{
                    position: "absolute", top: 14, left: 14, zIndex: 2,
                    fontSize: 10, fontWeight: 700, letterSpacing: 1,
                    textTransform: "uppercase", padding: "4px 10px", borderRadius: 4,
                  }}
                  className={item.tagColor}
                >
                  {item.tag}
                </span>
              </div>
              {/* Body */}
              <div style={{ padding: "18px 22px 22px" }}>
                <div
                  className="syne"
                  style={{ fontWeight: 700, fontSize: 18, marginBottom: 8, lineHeight: 1.3, color: "#e8eaed" }}
                >
                  {item.title}
                </div>
                <div style={{ fontSize: 13, color: "#8a919a", lineHeight: 1.55, marginBottom: 14 }}>
                  {item.excerpt}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 12, color: "#555d68" }}>
                  <span>{item.date}</span>
                  <span style={{ color: "#222830" }}>•</span>
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
        {/* Header */}
        <div
          className="sr-reveal"
          style={{
            display: "flex", alignItems: "flex-end",
            justifyContent: "space-between", marginBottom: 40,
          }}
        >
          <h2
            className="syne"
            style={{
              fontWeight: 800,
              fontSize: "clamp(32px, 4vw, 48px)",
              letterSpacing: "-1px",
              lineHeight: 1.1,
              color: "#e8eaed",
            }}
          >
            Recent <span style={{ color: "#e62020" }}>Creations</span>
          </h2>
          <button
            className="browse-btn"
            onClick={() => setLocation("/studios")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              color: "#8a919a", background: "transparent",
              border: "1px solid #222830", borderRadius: 50,
              padding: "8px 18px", fontSize: 14, fontWeight: 500,
              cursor: "pointer",
            }}
          >
            View all →
          </button>
        </div>

        {/* Masonry grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gridTemplateRows: "auto auto",
            gap: 16,
          }}
        >
          {CREATIONS.map((c, i) => (
            <div
              key={c.id}
              className={`creation-card shimmer-host sr-reveal sr-d${Math.min(i + 1, 6)}`}
              style={{
                background: "#131619", border: "1px solid #222830",
                borderRadius: 14, overflow: "hidden",
                cursor: "pointer", position: "relative",
                gridColumn: c.featured ? "span 2" : undefined,
                gridRow: c.featured ? "span 2" : undefined,
              }}
            >
              {/* Image */}
              <div
                style={{
                  width: "100%", height: "100%",
                  minHeight: c.featured ? 430 : 200,
                  backgroundImage: `url('${c.img}')`,
                  backgroundSize: "cover", backgroundPosition: "center",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(to top, rgba(11,13,15,.9) 0%, rgba(11,13,15,.1) 40%, transparent 60%)",
                  }}
                />
              </div>

              {/* Play button (video) */}
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

              {/* Overlay info */}
              <div
                style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  padding: 20, zIndex: 2,
                }}
              >
                <div
                  className="syne"
                  style={{
                    fontWeight: 700,
                    fontSize: c.featured ? 22 : 15,
                    marginBottom: c.featured ? 6 : 4,
                    color: "#e8eaed",
                  }}
                >
                  {c.title}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#555d68" }}>
                  <div
                    style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: "#1a1e22", display: "flex",
                      alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 700, color: "#e62020",
                    }}
                  >
                    {c.author}
                  </div>
                  <span>{c.platform}</span>
                  <span style={{ color: "#222830" }}>•</span>
                  <span>{c.views} views</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
