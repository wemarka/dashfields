/**
 * AccountGroupList.tsx
 * Renders the accounts dropdown list grouped by business name.
 * Each group shows as a single collapsed row with dual avatars (FB + IG),
 * business name, and platform subtitle. Clicking expands to show individual accounts.
 */
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { Globe2, ChevronDown } from "lucide-react";
import { PLATFORM_ICONS } from "./layout-parts";

type Account = {
  id: number;
  platform: string;
  name: string | null;
  username: string | null;
  profile_picture: string | null;
  account_type: string | null;
};

function PlatformIcon({ platform, className = "w-3 h-3" }: { platform: string; className?: string }) {
  const Icon = PLATFORM_ICONS[platform] ?? Globe2;
  return <Icon className={className} />;
}

// Normalize name for similarity comparison
function normalizeName(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff\s]/g, "").replace(/\s+/g, " ").trim();
}

function namesSimilar(a: string, b: string) {
  const na = normalizeName(a), nb = normalizeName(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

type NamedGroup = {
  groupName: string;
  accounts: Account[];
};

function buildGroups(metaAccounts: Account[]): NamedGroup[] {
  const groups: NamedGroup[] = [];
  const assignedIds = new Set<number>();
  for (const acc of metaAccounts) {
    if (assignedIds.has(acc.id)) continue;
    const accName = acc.name ?? acc.username ?? "";
    const siblings = metaAccounts.filter(
      other =>
        !assignedIds.has(other.id) &&
        other.id !== acc.id &&
        namesSimilar(accName, other.name ?? other.username ?? "")
    );
    const groupMembers = [acc, ...siblings];
    groupMembers.forEach(m => assignedIds.add(m.id));
    // Pick shortest non-empty name as group name (usually the page/business name)
    const groupName =
      groupMembers
        .map(m => m.name ?? m.username ?? "")
        .filter(Boolean)
        .sort((a, b) => a.length - b.length)[0] ?? accName;
    groups.push({ groupName, accounts: groupMembers });
  }
  return groups;
}

// ── Meta infinity logo ──
function MetaInfinityLogo() {
  return (
    <svg viewBox="0 0 28 14" className="w-4 h-2.5" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M7 7C7 5.067 8.567 3.5 10.5 3.5C12.433 3.5 13.5 5.25 14 7C14.5 8.75 15.567 10.5 17.5 10.5C19.433 10.5 21 8.933 21 7C21 5.067 19.433 3.5 17.5 3.5C15.567 3.5 14.5 5.25 14 7C13.5 8.75 12.433 10.5 10.5 10.5C8.567 10.5 7 8.933 7 7Z"
        stroke="#0866FF"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Single group row (collapsed) ──
function GroupRow({
  group,
  isActive,
  isExpanded,
  onToggleExpand,
}: {
  group: NamedGroup;
  isActive: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  // Pick page/business accounts (non-ad) for avatars
  const pageAccounts = group.accounts.filter(a => a.account_type !== "ad_account" && a.profile_picture);
  const fallbackAccounts = group.accounts.filter(a => a.profile_picture);
  const avatarAccounts = (pageAccounts.length > 0 ? pageAccounts : fallbackAccounts).slice(0, 2);

  // Platform labels (unique, capitalized)
  const platforms = Array.from(new Set(group.accounts.map(a => a.platform)));
  const platformLabel = platforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" · ");

  return (
    <button
      onClick={onToggleExpand}
      className={[
        "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors rounded-md mx-1",
        isActive
          ? "bg-brand/8 text-brand"
          : "hover:bg-foreground/5 text-foreground",
      ].join(" ")}
      style={{ width: "calc(100% - 8px)" }}
    >
      {/* Dual circular avatars */}
      <div className="relative shrink-0 w-9 h-7">
        {avatarAccounts.map((acc, i) => (
          <div
            key={acc.id}
            className="absolute top-0 w-7 h-7 rounded-full border-2 border-background overflow-hidden bg-muted"
            style={{ left: i === 0 ? 0 : 10, zIndex: avatarAccounts.length - i }}
          >
            {acc.profile_picture ? (
              <img src={acc.profile_picture} alt={acc.name ?? ""} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-brand/10 text-brand text-[9px] font-bold">
                {(acc.name ?? acc.platform).charAt(0).toUpperCase()}
              </div>
            )}
            {/* Platform badge */}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-background border border-border/30 flex items-center justify-center">
              <PlatformIcon platform={acc.platform} className="w-1.5 h-1.5" />
            </div>
          </div>
        ))}
        {/* If only one avatar, show a single centered one */}
        {avatarAccounts.length === 0 && (
          <div className="w-7 h-7 rounded-full bg-brand/10 flex items-center justify-center text-brand text-[10px] font-bold">
            {group.groupName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold truncate leading-tight">{group.groupName}</p>
        <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5 flex items-center gap-1">
          <MetaInfinityLogo />
          {platformLabel}
        </p>
      </div>

      {/* Expand chevron */}
      <ChevronDown
        className={[
          "w-3.5 h-3.5 shrink-0 text-muted-foreground/40 transition-transform duration-200",
          isExpanded ? "rotate-180" : "",
        ].join(" ")}
      />
    </button>
  );
}

// ── Individual account row (inside expanded group) ──
function AccountRow({
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
  const highlighted = isActive || isGroupActive;
  return (
    <button
      onClick={onClick}
      className={[
        "w-full flex items-center gap-2.5 pl-8 pr-3 py-1.5 text-left transition-colors",
        highlighted ? "bg-brand/5 text-brand" : "hover:bg-foreground/5 text-foreground",
      ].join(" ")}
    >
      <div className="relative shrink-0">
        <Avatar className="w-5 h-5">
          {acc.profile_picture && <AvatarImage src={acc.profile_picture} />}
          <AvatarFallback className="text-[8px] bg-brand/10 text-brand font-semibold">
            {(acc.name ?? acc.username ?? acc.platform).charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-background border border-border/30 flex items-center justify-center">
          <PlatformIcon platform={acc.platform} className="w-1.5 h-1.5" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-medium truncate">{acc.name ?? acc.username ?? acc.platform}</p>
        {acc.account_type && (
          <p className="text-[9px] text-muted-foreground/50 truncate capitalize">
            {acc.account_type === "ad_account" ? "Ad account" : acc.account_type}
          </p>
        )}
      </div>
      {isActive && (
        <svg className="w-2.5 h-2.5 shrink-0 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
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
}: {
  accounts: Account[];
  activeAccount: Account | null | undefined;
  setActiveAccount: (id: number) => void;
  setShowAccountDropdown: (v: boolean) => void;
}) {
  const metaAccounts = accounts.filter(a => a.platform === "facebook" || a.platform === "instagram");
  const otherAccounts = accounts.filter(a => a.platform !== "facebook" && a.platform !== "instagram");

  const groups = buildGroups(metaAccounts);

  // Map accountId -> groupIndex for linked highlighting
  const accountGroupMap = new Map<number, number>();
  groups.forEach((g, gi) => g.accounts.forEach(a => accountGroupMap.set(a.id, gi)));
  const activeGroupIdx = activeAccount ? (accountGroupMap.get(activeAccount.id) ?? -1) : -1;

  // Track which groups are expanded — auto-expand the active group
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

  return (
    <div className="py-1.5 max-h-72 overflow-y-auto">
      {/* ── Meta groups ── */}
      {groups.map((group, gi) => {
        const isGroupActive = gi === activeGroupIdx;
        const isExpanded = expandedGroups.has(gi);
        return (
          <div key={`meta-group-${gi}`} className="mb-0.5">
            <GroupRow
              group={group}
              isActive={isGroupActive}
              isExpanded={isExpanded}
              onToggleExpand={() => toggleGroup(gi)}
            />
            {/* Expanded individual accounts */}
            {isExpanded && (
              <div className="border-l border-border/20 ml-5 mt-0.5 mb-1">
                {group.accounts.map(acc => (
                  <AccountRow
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
      {(() => {
        const otherGrouped = otherAccounts.reduce<Record<string, Account[]>>((acc, a) => {
          if (!acc[a.platform]) acc[a.platform] = [];
          acc[a.platform].push(a);
          return acc;
        }, {});
        return Object.entries(otherGrouped).map(([platform, accs]) => (
          <div key={platform}>
            <p className="text-[9px] font-semibold tracking-widest uppercase text-muted-foreground/40 px-4 pt-2 pb-1 flex items-center gap-1.5">
              <PlatformIcon platform={platform} className="w-2.5 h-2.5" />
              {platform.charAt(0).toUpperCase() + platform.slice(1)}
            </p>
            {accs.map(acc => (
              <AccountRow
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
        ));
      })()}
    </div>
  );
}
