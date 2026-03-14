/**
 * AdAccountSelector.tsx
 * A dropdown that lets the user pick which connected ad account (or "All Accounts")
 * to use as the data source for the Campaigns page.
 */
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Layers, Wifi, WifiOff } from "lucide-react";

// ─── Platform icon map ────────────────────────────────────────────────────────
const PLATFORM_COLORS: Record<string, string> = {
  facebook:  "#1877F2",
  instagram: "#E1306C",
  tiktok:    "#010101",
  linkedin:  "#0A66C2",
  twitter:   "#1DA1F2",
  youtube:   "#FF0000",
  snapchat:  "#FFFC00",
  pinterest: "#E60023",
};

const PLATFORM_LABELS: Record<string, string> = {
  facebook:  "Facebook",
  instagram: "Instagram",
  tiktok:    "TikTok",
  linkedin:  "LinkedIn",
  twitter:   "X / Twitter",
  youtube:   "YouTube",
  snapchat:  "Snapchat",
  pinterest: "Pinterest",
};

function PlatformDot({ platform }: { platform: string }) {
  const color = PLATFORM_COLORS[platform] ?? "#737373";
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        backgroundColor: color,
        flexShrink: 0,
      }}
    />
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
export type AdAccount = {
  id: number;
  platform: string;
  name: string | null;
  username: string | null;
  platform_account_id: string | null;
  is_active: boolean;
  profile_picture?: string | null;
  account_type?: string | null;
};

export type AdAccountSelection =
  | { type: "all" }
  | { type: "single"; accountId: number }
  | { type: "group"; accountIds: number[] };

interface AdAccountSelectorProps {
  accounts: AdAccount[];
  isLoading?: boolean;
  value: AdAccountSelection;
  onChange: (value: AdAccountSelection) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function AdAccountSelector({
  accounts,
  isLoading = false,
  value,
  onChange,
}: AdAccountSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Derive label for the trigger button
  const triggerLabel = (() => {
    if (value.type === "all") return "All Accounts";
    if (value.type === "single") {
      const acc = accounts.find(a => a.id === value.accountId);
      return acc ? (acc.name ?? acc.username ?? `Account #${acc.id}`) : "Select Account";
    }
    if (value.type === "group") return `${value.accountIds.length} Accounts`;
    return "Select Account";
  })();

  const triggerAccount = value.type === "single"
    ? accounts.find(a => a.id === value.accountId) ?? null
    : null;

  const isAllSelected = value.type === "all";

  // Group accounts by platform
  const grouped = accounts.reduce<Record<string, AdAccount[]>>((acc, a) => {
    const key = a.platform;
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* ── Trigger button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          height: 34,
          paddingLeft: 10,
          paddingRight: 10,
          borderRadius: 8,
          border: open ? "1px solid #404040" : "1px solid #262626",
          backgroundColor: open ? "#1f1f1f" : "#171717",
          cursor: "pointer",
          transition: "background-color 0.15s, border-color 0.15s",
          minWidth: 160,
          maxWidth: 260,
        }}
        onMouseEnter={e => {
          if (!open) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1f1f1f";
        }}
        onMouseLeave={e => {
          if (!open) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#171717";
        }}
      >
        {/* Icon */}
        {isLoading ? (
          <div style={{ width: 18, height: 18, borderRadius: 4, backgroundColor: "#262626", flexShrink: 0 }} />
        ) : isAllSelected ? (
          <div style={{
            width: 18, height: 18, borderRadius: 4,
            backgroundColor: "rgba(230,32,32,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Layers style={{ width: 10, height: 10, color: "#e62020" }} />
          </div>
        ) : triggerAccount ? (
          triggerAccount.profile_picture ? (
            <img
              src={triggerAccount.profile_picture}
              alt=""
              style={{ width: 18, height: 18, borderRadius: 4, objectFit: "cover", flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: 18, height: 18, borderRadius: 4,
              backgroundColor: PLATFORM_COLORS[triggerAccount.platform] ?? "#262626",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <span style={{ fontSize: 9, color: "#fff", fontWeight: 700 }}>
                {(triggerAccount.name ?? triggerAccount.platform ?? "?")[0].toUpperCase()}
              </span>
            </div>
          )
        ) : (
          <div style={{
            width: 18, height: 18, borderRadius: 4, backgroundColor: "#262626", flexShrink: 0,
          }} />
        )}

        {/* Label */}
        <span style={{
          fontSize: 12, fontWeight: 500, color: "#e5e5e5",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, textAlign: "left",
        }}>
          {isLoading ? "Loading..." : triggerLabel}
        </span>

        {/* Status dot */}
        {!isAllSelected && triggerAccount && (
          <span style={{
            width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
            backgroundColor: triggerAccount.is_active ? "#22c55e" : "#737373",
          }} />
        )}

        <ChevronDown
          style={{
            width: 13, height: 13, color: "#737373", flexShrink: 0,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        />
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 9999,
            minWidth: 240,
            maxWidth: 320,
            backgroundColor: "#171717",
            border: "1px solid #262626",
            borderRadius: 10,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            overflow: "hidden",
          }}
        >
          {/* "All Accounts" option */}
          <button
            onClick={() => { onChange({ type: "all" }); setOpen(false); }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 12px",
              backgroundColor: isAllSelected ? "rgba(230,32,32,0.08)" : "transparent",
              border: "none",
              borderBottom: "1px solid #1f1f1f",
              cursor: "pointer",
              transition: "background-color 0.12s",
            }}
            onMouseEnter={e => {
              if (!isAllSelected) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1f1f1f";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = isAllSelected ? "rgba(230,32,32,0.08)" : "transparent";
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: 6,
              backgroundColor: isAllSelected ? "rgba(230,32,32,0.15)" : "#262626",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Layers style={{ width: 13, height: 13, color: isAllSelected ? "#e62020" : "#a3a3a3" }} />
            </div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#ffffff", margin: 0 }}>All Accounts</p>
              <p style={{ fontSize: 10, color: "#737373", margin: 0, marginTop: 1 }}>
                {accounts.length} account{accounts.length !== 1 ? "s" : ""} combined
              </p>
            </div>
            {isAllSelected && (
              <Check style={{ width: 13, height: 13, color: "#e62020", flexShrink: 0 }} />
            )}
          </button>

          {/* Grouped by platform */}
          <div style={{ maxHeight: 320, overflowY: "auto" }}>
            {Object.entries(grouped).map(([platform, accts]) => (
              <div key={platform}>
                {/* Platform group header */}
                <div style={{
                  padding: "6px 12px 4px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}>
                  <PlatformDot platform={platform} />
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: "#737373",
                    textTransform: "uppercase", letterSpacing: "0.06em",
                  }}>
                    {PLATFORM_LABELS[platform] ?? platform}
                  </span>
                </div>

                {/* Account rows */}
                {accts.map(acc => {
                  const isSelected = value.type === "single" && value.accountId === acc.id;
                  return (
                    <button
                      key={acc.id}
                      onClick={() => { onChange({ type: "single", accountId: acc.id }); setOpen(false); }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "7px 12px 7px 24px",
                        backgroundColor: isSelected ? "rgba(230,32,32,0.08)" : "transparent",
                        border: "none",
                        cursor: "pointer",
                        transition: "background-color 0.12s",
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1f1f1f";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = isSelected ? "rgba(230,32,32,0.08)" : "transparent";
                      }}
                    >
                      {/* Avatar */}
                      {acc.profile_picture ? (
                        <img
                          src={acc.profile_picture}
                          alt=""
                          style={{ width: 26, height: 26, borderRadius: 5, objectFit: "cover", flexShrink: 0 }}
                        />
                      ) : (
                        <div style={{
                          width: 26, height: 26, borderRadius: 5,
                          backgroundColor: PLATFORM_COLORS[acc.platform] ?? "#262626",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                          <span style={{ fontSize: 10, color: "#fff", fontWeight: 700 }}>
                            {(acc.name ?? acc.platform ?? "?")[0].toUpperCase()}
                          </span>
                        </div>
                      )}

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                        <p style={{
                          fontSize: 12, fontWeight: 500, color: "#e5e5e5",
                          margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {acc.name ?? acc.username ?? `Account #${acc.id}`}
                        </p>
                        {acc.platform_account_id && (
                          <p style={{ fontSize: 10, color: "#737373", margin: 0, marginTop: 1 }}>
                            ID: {acc.platform_account_id}
                          </p>
                        )}
                      </div>

                      {/* Status */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        {acc.is_active ? (
                          <Wifi style={{ width: 11, height: 11, color: "#22c55e" }} />
                        ) : (
                          <WifiOff style={{ width: 11, height: 11, color: "#737373" }} />
                        )}
                        {isSelected && (
                          <Check style={{ width: 12, height: 12, color: "#e62020" }} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Empty state */}
          {accounts.length === 0 && (
            <div style={{ padding: "20px 16px", textAlign: "center" }}>
              <p style={{ fontSize: 12, color: "#737373", margin: 0 }}>No accounts connected</p>
              <p style={{ fontSize: 11, color: "#525252", margin: "4px 0 0" }}>
                Connect your ad accounts in Connections
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
