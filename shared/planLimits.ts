// shared/planLimits.ts
// Central config for plan tier limits — used by both server and client

export type WorkspacePlan = "free" | "pro" | "agency" | "enterprise";

export interface PlanConfig {
  name: string;
  maxWorkspaces: number;
  maxSocialAccounts: number;
  maxTeamMembers: number;
  price: { monthly: number; annual: number };
  features: string[];
  badge: { label: string; color: string };
}

export const PLAN_LIMITS: Record<WorkspacePlan, PlanConfig> = {
  free: {
    name: "Free",
    maxWorkspaces: 1,
    maxSocialAccounts: 3,
    maxTeamMembers: 1,
    price: { monthly: 0, annual: 0 },
    features: [
      "1 Workspace",
      "3 Social Accounts",
      "Basic Analytics",
      "7-day data history",
    ],
    badge: { label: "Free", color: "bg-gray-100 text-gray-600" },
  },
  pro: {
    name: "Pro",
    maxWorkspaces: 3,
    maxSocialAccounts: 10,
    maxTeamMembers: 5,
    price: { monthly: 49, annual: 39 },
    features: [
      "3 Workspaces",
      "10 Social Accounts",
      "Advanced Analytics",
      "90-day data history",
      "Scheduled Reports",
      "5 Team Members",
    ],
    badge: { label: "Pro", color: "bg-blue-100 text-blue-700" },
  },
  agency: {
    name: "Agency",
    maxWorkspaces: Infinity,
    maxSocialAccounts: Infinity,
    maxTeamMembers: Infinity,
    price: { monthly: 149, annual: 119 },
    features: [
      "Unlimited Workspaces",
      "Unlimited Social Accounts",
      "Full Analytics Suite",
      "1-year data history",
      "White-label Reports",
      "Unlimited Team Members",
      "Priority Support",
    ],
    badge: { label: "Agency", color: "bg-purple-100 text-purple-700" },
  },
  enterprise: {
    name: "Enterprise",
    maxWorkspaces: Infinity,
    maxSocialAccounts: Infinity,
    maxTeamMembers: Infinity,
    price: { monthly: 0, annual: 0 },
    features: [
      "Everything in Agency",
      "Custom Integrations",
      "Dedicated Account Manager",
      "SLA Guarantee",
      "Custom Contracts",
    ],
    badge: { label: "Enterprise", color: "bg-amber-100 text-amber-700" },
  },
};

/** Returns true if the user can create another workspace given their current plan */
export function canCreateWorkspace(plan: WorkspacePlan, currentCount: number): boolean {
  const limit = PLAN_LIMITS[plan].maxWorkspaces;
  return currentCount < limit;
}

/** Returns a human-readable error message when workspace limit is exceeded */
export function workspaceLimitMessage(plan: WorkspacePlan): string {
  const config = PLAN_LIMITS[plan];
  if (plan === "free") {
    return `Your Free plan allows only ${config.maxWorkspaces} workspace. Upgrade to Pro to create up to 3 workspaces.`;
  }
  if (plan === "pro") {
    return `Your Pro plan allows up to ${config.maxWorkspaces} workspaces. Upgrade to Agency for unlimited workspaces.`;
  }
  return "Workspace limit reached. Please contact support.";
}
