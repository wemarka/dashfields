/**
 * AccountGroupList.tsx
 * Renders the accounts dropdown list grouped by business name.
 *
 * Reference design:
 * ┌─────────────────────────────────────────┐
 * │ [Avatar+badge]  Business Name      ∧/∨  │  ← group row (highlighted if active)
 * │                 ∞ Instagram             │
 * ├─────────────────────────────────────────┤
 * │   [Avatar+badge]  Account Name     ✓   │  ← individual row (indented)
 * │                   Business              │
 * └─────────────────────────────────────────┘
 *
 * Groups are built by name similarity (FB + IG + Ad accounts with same business name).
 * Clicking a group row expands/collapses the individual accounts.
 * Clicking an individual account selects it and closes the dropdown.
 */
import { useState } from "react";
import { Globe2, ChevronUp, ChevronDown, Check } from "lucide-react";
import { PLATFORM_ICONS } from "./layout-parts";

type Account = {
  id: number;
  platform: string;
  name: string | null;
  username: string | null;
  profile_picture: string | null;
  account_type: string | null;
};

// ── Platform icon helper ──
function PlatformIcon({ platform, size = 10 }: { platform: string; size?: number }) {
  const Icon = PLATFORM_ICONS[platform] ?? Globe2;
  return <Icon style={{ width: size, height: size }} />;
}

// ── Meta infinity logo (SVG) ──
function MetaInfinity({ className = "w-3.5 h-2" }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 14" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M7 7C7 5.067 8.567 3.5 10.5 3.5C12.433 3.5 13.5 5.25 14 7C14.5 8.75 15.567 10.5 17.5 10.5C19.433 10.5 21 8.933 21 7C21 5.067 19.433 3.5 17.5 3.5C15.567 3.5 14.5 5.25 14 7C13.5 8.75 12.433 10.5 10.5 10.5C8.567 10.5 7 8.933 7 7Z"
        stroke="#0866FF"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Account avatar with platform badge ──
function AccountAvatar({
  account,
  size = 40,
  badgeSize = 14,
}: {
  account: Account;
  size?: number;
  badgeSize?: number;
}) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="rounded-full overflow-hidden bg-muted"
        style={{ width: size, height: size }}
      >
        {account.profile_picture ? (
          <img
            src={account.profile_picture}
            alt={account.name ?? ""}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center bg-brand/10 text-brand font-bold"
            style={{ fontSize: size * 0.35 }}
          >
            {(account.name ?? account.username ?? account.platform).charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      {/* Platform badge */}
      <div
        className="absolute -bottom-0.5 -right-0.5 rounded-full bg-background border border-border/40 flex items-center justify-center"
        style={{ width: badgeSize, height: badgeSize }}
      >
        <PlatformIcon platform={account.platform} size={badgeSize * 0.6} />
      </div>
    </div>
  );
}

// ── Name normalization for grouping ──
// Words to ignore when extracting meaningful tokens
const STOP_WORDS = new Set([
  "official", "center", "centre", "business", "page", "account",
  "media", "digital", "marketing", "agency", "studio", "group",
  "com", "net", "org", "co", "inc", "llc", "ltd", "the", "and",
  "مركز", "رسمي", "أعمال", "تسويق",
]);

function normalizeName(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract meaningful tokens (words) from a name, ignoring stop words and short tokens */
function extractTokens(s: string): string[] {
  return normalizeName(s).split(" ").filter(t => t.length >= 3 && !STOP_WORDS.has(t));
}

/** Two names are similar if they share at least one meaningful token, or one contains the other */
function namesSimilar(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  // Exact or substring match
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  // Space-removed comparison: "i lang center" → "ilangcenter" vs "ilang center" → "ilangcenter"
  const naNoSpace = na.replace(/\s/g, "");
  const nbNoSpace = nb.replace(/\s/g, "");
  if (naNoSpace === nbNoSpace || naNoSpace.includes(nbNoSpace) || nbNoSpace.includes(naNoSpace)) return true;
  // Shared meaningful token
  const ta = extractTokens(a);
  const tb = new Set<string>(extractTokens(b));
  if (ta.length === 0 || tb.size === 0) return false;
  return ta.some(t => tb.has(t));
}

type NamedGroup = { groupName: string; accounts: Account[]; primaryAccount: Account };

function buildGroups(metaAccounts: Account[]): NamedGroup[] {
  // Union-Find style: merge all accounts that share a name similarity
  const n = metaAccounts.length;
  const parent = Array.from({ length: n }, (_, i) => i);

  function find(i: number): number {
    if (parent[i] !== i) parent[i] = find(parent[i]);
    return parent[i];
  }
  function union(i: number, j: number) {
    parent[find(i)] = find(j);
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const nameA = metaAccounts[i].name ?? metaAccounts[i].username ?? "";
      const nameB = metaAccounts[j].name ?? metaAccounts[j].username ?? "";
      if (namesSimilar(nameA, nameB)) union(i, j);
    }
  }

  // Collect groups
  const groupMap = new Map<number, Account[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!groupMap.has(root)) groupMap.set(root, []);
    groupMap.get(root)!.push(metaAccounts[i]);
  }

  const groups: NamedGroup[] = [];
  Array.from(groupMap.values()).forEach((members: Account[]) => {
    // Best group name: prefer page/business type, then shortest non-empty name
    const groupName: string =
      members
        .filter((m: Account) => m.account_type !== "ad_account")
        .map((m: Account) => m.name ?? m.username ?? "")
        .filter(Boolean)
        .sort((a: string, b: string) => a.length - b.length)[0] ??
      members
        .map((m: Account) => m.name ?? m.username ?? "")
        .filter(Boolean)
        .sort((a: string, b: string) => a.length - b.length)[0] ??
      "";

    // Primary account for avatar: prefer page/business with picture
    const primaryAccount: Account =
      members.find((m: Account) => m.account_type !== "ad_account" && m.profile_picture) ??
      members.find((m: Account) => m.profile_picture) ??
      members[0];

    groups.push({ groupName, accounts: members, primaryAccount });
  });

  // Sort groups: active group first, then alphabetically
  return groups.sort((a, b) => a.groupName.localeCompare(b.groupName));
}

// ── Account type label ──
function accountTypeLabel(type: string | null, platform: string): string {
  if (!type) return platform.charAt(0).toUpperCase() + platform.slice(1);
  if (type === "ad_account") return "Ad account";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

// ── Platform subtitle for group (e.g. "Instagram" or "Instagram · Facebook") ──
function platformSubtitle(accounts: Account[]): string {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const a of accounts) {
    const label = a.platform.charAt(0).toUpperCase() + a.platform.slice(1);
    if (!seen.has(label)) { seen.add(label); labels.push(label); }
  }
  return labels.join(" · ");
}

// ── Group row ──
function GroupRow({
  group,
  isGroupActive,
  isExpanded,
  onToggle,
  onSelectGroup,
}: {
  group: NamedGroup;
  isGroupActive: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onSelectGroup: () => void;
}) {
  return (
    <div
      className={[
        "w-full flex items-center gap-3 px-3 py-2.5 transition-colors",
        isGroupActive
          ? "bg-brand/10 text-brand"
          : "hover:bg-foreground/5 text-foreground",
      ].join(" ")}
    >
      {/* Clicking avatar+text area selects the whole group */}
      <button
        onClick={onSelectGroup}
        className="flex items-center gap-3 flex-1 min-w-0 text-left"
      >
        <AccountAvatar account={group.primaryAccount} size={38} badgeSize={14} />
        <div className="flex-1 min-w-0">
          <p className={[
            "text-[13px] font-semibold truncate leading-tight",
            isGroupActive ? "text-brand" : "text-foreground",
          ].join(" ")}>
            {group.groupName}
          </p>
          <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5 flex items-center gap-1">
            <MetaInfinity />
            {platformSubtitle(group.accounts)}
          </p>
        </div>
      </button>

      {/* Chevron toggles expand/collapse */}
      <button onClick={onToggle} className="shrink-0 p-1 rounded hover:bg-foreground/10">
        {isExpanded
          ? <ChevronUp className="w-4 h-4 text-muted-foreground/50" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground/50" />
        }
      </button>
    </div>
  );
}

// ── Individual account row (indented) ──
function IndividualRow({
  acc,
  isActive,
  isGroupActive,
  onClick,
}: {
  acc: Account;
  isActive: boolean;
  isGroupActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full flex items-center gap-3 pl-5 pr-3 py-2 text-left transition-colors",
        isActive
          ? "bg-brand/8 text-brand"
          : isGroupActive
            ? "bg-brand/5 hover:bg-brand/8 text-foreground"
            : "hover:bg-foreground/5 text-foreground",
      ].join(" ")}
    >
      <AccountAvatar account={acc} size={32} badgeSize={12} />
      <div className="flex-1 min-w-0">
        <p className={[
          "text-[12px] font-medium truncate leading-tight",
          isActive ? "text-brand" : "text-foreground",
        ].join(" ")}>
          {acc.name ?? acc.username ?? acc.platform}
        </p>
        <p className="text-[10px] text-muted-foreground/55 truncate mt-0.5">
          {accountTypeLabel(acc.account_type, acc.platform)}
        </p>
      </div>
      {isActive && (
        <Check className="w-3.5 h-3.5 shrink-0 text-brand" strokeWidth={3} />
      )}
    </button>
  );
}

// ── Main export ──
export function AccountGroupList({
  accounts,
  activeAccount,
  setActiveAccount,
  setShowAccountDropdown,
  setActiveGroupIds,
}: {
  accounts: Account[];
  activeAccount: Account | null | undefined;
  setActiveAccount: (id: number) => void;
  setShowAccountDropdown: (v: boolean) => void;
  setActiveGroupIds?: (ids: number[]) => void;
}) {
  const metaAccounts = accounts.filter(
    a => a.platform === "facebook" || a.platform === "instagram"
  );
  const otherAccounts = accounts.filter(
    a => a.platform !== "facebook" && a.platform !== "instagram"
  );

  const groups = buildGroups(metaAccounts);

  // Map accountId -> groupIndex for linked highlighting
  const accountGroupMap = new Map<number, number>();
  groups.forEach((g, gi) => g.accounts.forEach(a => accountGroupMap.set(a.id, gi)));
  const activeGroupIdx = activeAccount
    ? (accountGroupMap.get(activeAccount.id) ?? -1)
    : -1;

  // Auto-expand the active group on mount
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(() => {
    const initial = new Set<number>();
    if (activeAccount) {
      const gi = accountGroupMap.get(activeAccount.id);
      if (gi !== undefined) initial.add(gi);
    }
    return initial;
  });

  const toggleGroup = (gi: number) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(gi)) next.delete(gi);
      else next.add(gi);
      return next;
    });
  };

  // Other platforms grouped
  const otherByPlatform = otherAccounts.reduce<Record<string, Account[]>>((map, a) => {
    if (!map[a.platform]) map[a.platform] = [];
    map[a.platform].push(a);
    return map;
  }, {});

  return (
    <div className="py-1 max-h-72 overflow-y-auto">
      {/* ── Meta groups ── */}
      {groups.map((group, gi) => {
        const isGroupActive = gi === activeGroupIdx;
        const isExpanded = expandedGroups.has(gi);
        return (
          <div key={`meta-group-${gi}`}>
            <GroupRow
              group={group}
              isGroupActive={isGroupActive}
              isExpanded={isExpanded}
              onToggle={() => toggleGroup(gi)}
              onSelectGroup={() => {
                // Select the first non-ad-account in the group as the primary active account
                const primary =
                  group.accounts.find(a => a.account_type !== "ad_account") ??
                  group.accounts[0];
                setActiveAccount(primary.id);
                // Store all group IDs for pages that need multi-account filtering
                if (setActiveGroupIds) setActiveGroupIds(group.accounts.map(a => a.id));
                setShowAccountDropdown(false);
              }}
            />
            {isExpanded && (
              <div>
                {group.accounts.map(acc => (
                  <IndividualRow
                    key={acc.id}
                    acc={acc}
                    isActive={activeAccount?.id === acc.id}
                    isGroupActive={isGroupActive}
                    onClick={() => {
                      setActiveAccount(acc.id);
                      setShowAccountDropdown(false);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* ── Other platforms ── */}
      {Object.entries(otherByPlatform).map(([platform, accs]) => (
        <div key={platform}>
          <p className="text-[9px] font-semibold tracking-widest uppercase text-muted-foreground/40 px-3 pt-2 pb-1 flex items-center gap-1.5">
            <PlatformIcon platform={platform} size={10} />
            {platform.charAt(0).toUpperCase() + platform.slice(1)}
          </p>
          {accs.map(acc => (
            <IndividualRow
              key={acc.id}
              acc={acc}
              isActive={activeAccount?.id === acc.id}
              isGroupActive={false}
              onClick={() => {
                setActiveAccount(acc.id);
                setShowAccountDropdown(false);
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
