/**
 * AdAccountSelector.tsx
 * Dropdown to select a connected ad account.
 * - Shows ONLY accounts with account_type = 'ad_account'
 * - Deduplicates strictly by platform_account_id (no fuzzy name matching)
 * - Shows Ad Account ID under each name
 * - Meta (FB/IG) accounts grouped under a single Meta Ads section
 * - No "All Accounts" option
 */
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Wifi, WifiOff } from "lucide-react";

// ─── Meta official logo ───────────────────────────────────────────────────────
const META_LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663380599885/KXbJ95iGQTQDrViqhuR8ny/meta-icon_d38aa588.png";

function MetaLogo({ size = 14 }: { size?: number }) {
  return (
    <img
      src={META_LOGO_URL}
      alt="Meta"
      style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }}
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const META_PLATFORMS = new Set(["facebook", "instagram"]);

/**
 * Build Meta groups strictly by platform_account_id.
 * Only accounts with account_type = 'ad_account' are included.
 * Each unique platform_account_id = one entry.
 */
function buildMetaGroups(accounts: AdAccount[]) {
  // Filter to ad_account type only
  const adAccounts = accounts.filter(a =>
    a.account_type === "ad_account" || a.account_type === "ad"
  );

  const metaAccounts = adAccounts.filter(a => META_PLATFORMS.has(a.platform));
  const otherAccounts = adAccounts.filter(a => !META_PLATFORMS.has(a.platform));

  // Deduplicate strictly by platform_account_id
  const seenPlatformIds = new Map<string, AdAccount>();
  const uniqueMeta: AdAccount[] = [];

  for (const acc of metaAccounts) {
    const pid = acc.platform_account_id?.trim();
    if (pid) {
      if (!seenPlatformIds.has(pid)) {
        seenPlatformIds.set(pid, acc);
        uniqueMeta.push(acc);
      } else {
        // Keep the one with a profile picture
        const existing = seenPlatformIds.get(pid)!;
        if (!existing.profile_picture && acc.profile_picture) {
          seenPlatformIds.set(pid, acc);
          const idx = uniqueMeta.indexOf(existing);
          if (idx !== -1) uniqueMeta[idx] = acc;
        }
      }
    } else {
      // No platform_account_id — include as-is (rare fallback)
      uniqueMeta.push(acc);
    }
  }

  // Each unique Meta account becomes its own group
  const metaGroups = uniqueMeta
    .map(acc => ({
      id: `meta-${acc.id}`,
      displayName: acc.name ?? acc.username ?? `Account #${acc.id}`,
      adAccountId: acc.platform_account_id ?? null,
      picture: acc.profile_picture ?? null,
      isActive: acc.is_active,
      members: [acc],
      accountIds: [acc.id],
      primaryId: acc.id,
    }))
    .sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return a.displayName.localeCompare(b.displayName);
    });

  // Deduplicate other platforms by platform_account_id too
  const seenOtherIds = new Map<string, AdAccount>();
  const uniqueOther: AdAccount[] = [];
  for (const acc of otherAccounts) {
    const pid = acc.platform_account_id?.trim();
    if (pid) {
      if (!seenOtherIds.has(pid)) {
        seenOtherIds.set(pid, acc);
        uniqueOther.push(acc);
      }
    } else {
      uniqueOther.push(acc);
    }
  }

  return { metaGroups, otherAccounts: uniqueOther };
}

// ─── Avatar component ─────────────────────────────────────────────────────────
function Avatar({ src, name, size = 28 }: { src?: string | null; name: string; size?: number }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{
          width: size, height: size, borderRadius: size / 4,
          objectFit: "cover", flexShrink: 0,
          border: "1px solid #262626",
        }}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 4,
      background: "linear-gradient(135deg, #0082FB 0%, #A033FF 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, fontSize: size * 0.38, color: "#fff", fontWeight: 700,
    }}>
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
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

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const { metaGroups, otherAccounts } = buildMetaGroups(accounts);

  // Resolve trigger display
  const triggerInfo = (() => {
    if (value.type === "group") {
      const grp = metaGroups.find(g =>
        g.accountIds.length === value.accountIds.length &&
        g.accountIds.every(id => value.accountIds.includes(id))
      ) ?? metaGroups[0] ?? null;
      if (grp) return { name: grp.displayName, picture: grp.picture, isActive: grp.isActive };
    }
    if (value.type === "single") {
      const acc = accounts.find(a => a.id === value.accountId);
      if (acc) return { name: acc.name ?? acc.username ?? `#${acc.id}`, picture: acc.profile_picture ?? null, isActive: acc.is_active };
    }
    const first = metaGroups[0];
    if (first) return { name: first.displayName, picture: first.picture, isActive: first.isActive };
    return { name: "Select Account", picture: null, isActive: false };
  })();

  // Auto-select first group on mount if nothing selected
  useEffect(() => {
    if (value.type === "all" && metaGroups.length > 0) {
      const first = metaGroups[0];
      onChange({ type: "group", accountIds: first.accountIds });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metaGroups.length]);

  const isGroupSelected = (grp: ReturnType<typeof buildMetaGroups>["metaGroups"][0]) => {
    if (value.type === "group") {
      return grp.accountIds.length === value.accountIds.length &&
        grp.accountIds.every(id => (value as { accountIds: number[] }).accountIds.includes(id));
    }
    if (value.type === "single") return grp.accountIds.includes(value.accountId);
    return false;
  };

  const totalGroups = metaGroups.length + otherAccounts.length;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* ── Trigger ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          height: 34, paddingLeft: 10, paddingRight: 10,
          borderRadius: 8,
          border: open ? "1px solid #404040" : "1px solid #262626",
          backgroundColor: open ? "#1f1f1f" : "#171717",
          cursor: "pointer", transition: "background-color 0.15s, border-color 0.15s",
          minWidth: 170, maxWidth: 270,
        }}
        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1f1f1f"; }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#171717"; }}
      >
        {isLoading ? (
          <div style={{ width: 20, height: 20, borderRadius: 5, backgroundColor: "#262626", flexShrink: 0 }} />
        ) : (
          <div style={{ position: "relative", flexShrink: 0 }}>
            <Avatar src={triggerInfo.picture} name={triggerInfo.name} size={20} />
            {/* Meta badge — no background */}
            <div style={{
              position: "absolute", bottom: -3, right: -3,
              width: 12, height: 12,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <MetaLogo size={11} />
            </div>
          </div>
        )}

        <span style={{
          fontSize: 12, fontWeight: 500, color: "#e5e5e5",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          flex: 1, textAlign: "left",
        }}>
          {isLoading ? "Loading..." : triggerInfo.name}
        </span>

        <span style={{
          width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
          backgroundColor: triggerInfo.isActive ? "#22c55e" : "#737373",
        }} />

        <ChevronDown style={{
          width: 13, height: 13, color: "#737373", flexShrink: 0,
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s",
        }} />
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 9999,
          minWidth: 280, maxWidth: 360,
          backgroundColor: "#171717",
          border: "1px solid #262626",
          borderRadius: 10,
          boxShadow: "0 8px 32px rgba(0,0,0,0.55)",
          overflow: "hidden",
        }}>
          {/* ── Meta section header ── */}
          {metaGroups.length > 0 && (
            <div style={{
              padding: "7px 12px 4px",
              display: "flex", alignItems: "center", gap: 6,
              borderBottom: "1px solid #1f1f1f",
            }}>
              <MetaLogo size={12} />
              <span style={{
                fontSize: 10, fontWeight: 700, color: "#737373",
                textTransform: "uppercase", letterSpacing: "0.07em",
              }}>
                Meta Ads
              </span>
              <span style={{ marginLeft: "auto", fontSize: 10, color: "#525252" }}>
                {metaGroups.length} account{metaGroups.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* ── Meta groups ── */}
          <div style={{ maxHeight: 340, overflowY: "auto" }}>
            {metaGroups.map((grp) => {
              const selected = isGroupSelected(grp);
              return (
                <button
                  key={grp.id}
                  onClick={() => {
                    onChange({ type: "group", accountIds: grp.accountIds });
                    setOpen(false);
                  }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 12px",
                    backgroundColor: selected ? "rgba(230,32,32,0.07)" : "transparent",
                    border: "none", borderBottom: "1px solid #1a1a1a",
                    cursor: "pointer", transition: "background-color 0.12s",
                    textAlign: "left",
                  }}
                  onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1f1f1f"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = selected ? "rgba(230,32,32,0.07)" : "transparent"; }}
                >
                  {/* Avatar with Meta badge — no background circle */}
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <Avatar src={grp.picture} name={grp.displayName} size={36} />
                    <div style={{
                      position: "absolute", bottom: -2, right: -4,
                      width: 14, height: 14,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <MetaLogo size={13} />
                    </div>
                  </div>

                  {/* Info: name + Ad Account ID */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 12, fontWeight: 600, color: "#ffffff",
                      margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {grp.displayName}
                    </p>
                    <p style={{ fontSize: 10, color: "#525252", margin: 0, marginTop: 2, fontFamily: "monospace" }}>
                      {grp.adAccountId ? `ID: ${grp.adAccountId}` : "Meta Ads"}
                    </p>
                  </div>

                  {/* Status + check */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    {grp.isActive
                      ? <Wifi style={{ width: 12, height: 12, color: "#22c55e" }} />
                      : <WifiOff style={{ width: 12, height: 12, color: "#737373" }} />
                    }
                    {selected && <Check style={{ width: 13, height: 13, color: "#e62020" }} />}
                  </div>
                </button>
              );
            })}

            {/* ── Other platforms ── */}
            {otherAccounts.length > 0 && (
              <>
                <div style={{
                  padding: "7px 12px 4px",
                  display: "flex", alignItems: "center", gap: 6,
                  borderTop: "1px solid #262626",
                }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: "#737373",
                    textTransform: "uppercase", letterSpacing: "0.07em",
                  }}>
                    Other Platforms
                  </span>
                </div>
                {otherAccounts.map(acc => {
                  const selected = value.type === "single" && value.accountId === acc.id;
                  return (
                    <button
                      key={acc.id}
                      onClick={() => { onChange({ type: "single", accountId: acc.id }); setOpen(false); }}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 12px",
                        backgroundColor: selected ? "rgba(230,32,32,0.07)" : "transparent",
                        border: "none", borderBottom: "1px solid #1a1a1a",
                        cursor: "pointer", transition: "background-color 0.12s",
                        textAlign: "left",
                      }}
                      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1f1f1f"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = selected ? "rgba(230,32,32,0.07)" : "transparent"; }}
                    >
                      <Avatar src={acc.profile_picture} name={acc.name ?? acc.platform} size={36} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 12, fontWeight: 500, color: "#e5e5e5",
                          margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {acc.name ?? acc.username ?? `Account #${acc.id}`}
                        </p>
                        <p style={{ fontSize: 10, color: "#525252", margin: 0, marginTop: 1, fontFamily: "monospace" }}>
                          {acc.platform_account_id ? `ID: ${acc.platform_account_id}` : acc.platform}
                        </p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        {acc.is_active
                          ? <Wifi style={{ width: 12, height: 12, color: "#22c55e" }} />
                          : <WifiOff style={{ width: 12, height: 12, color: "#737373" }} />
                        }
                        {selected && <Check style={{ width: 13, height: 13, color: "#e62020" }} />}
                      </div>
                    </button>
                  );
                })}
              </>
            )}

            {/* Empty state */}
            {totalGroups === 0 && (
              <div style={{ padding: "20px 16px", textAlign: "center" }}>
                <p style={{ fontSize: 12, color: "#737373", margin: 0 }}>No ad accounts connected</p>
                <p style={{ fontSize: 11, color: "#525252", margin: "4px 0 0" }}>
                  Connect your ad accounts in Connections
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
