/**
 * Campaigns.tsx — Campaigns management page
 * Composed from small components in client/src/components/campaigns/
 */
import DashboardLayout from "@/components/DashboardLayout";
import CreateCampaignModal from "@/components/CreateCampaignModal";
import { CampaignDetailDrawer } from "@/components/CampaignDetailDrawer";
import { CampaignFilters } from "@/components/campaigns/CampaignFilters";
import { MetaCampaignTable } from "@/components/campaigns/MetaCampaignTable";
import { LocalCampaignTable } from "@/components/campaigns/LocalCampaignTable";
import { useState } from "react";
import { Plus, Facebook, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Tab = "local" | "meta";

export default function Campaigns() {
  const [search, setSearch]           = useState("");
  const [filter, setFilter]           = useState("all");
  const [showCreate, setShowCreate]   = useState(false);
  const [tab, setTab]                 = useState<Tab>("meta");
  const [datePreset, setDatePreset]   = useState("last_30d");
  const [selectedCampaign, setSelectedCampaign] = useState<{
    id: string; name: string; status: string; objective?: string; dailyBudget?: number | null
  } | null>(null);

  const utils = trpc.useUtils();

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: localCampaigns = [], isLoading: localLoading } = trpc.campaigns.list.useQuery();
  const { data: metaStatus } = trpc.meta.connectionStatus.useQuery();
  const isConnected = metaStatus?.connected ?? false;

  const {
    data: metaCampaigns = [],
    isLoading: metaLoading,
    refetch: refetchMeta,
  } = trpc.meta.campaigns.useQuery({ limit: 50 }, { enabled: isConnected });

  const {
    data: metaInsights = [],
    isLoading: insightsLoading,
    refetch: refetchInsights,
  } = trpc.meta.campaignInsights.useQuery(
    { datePreset: datePreset as any, limit: 50 },
    { enabled: isConnected }
  );

  // Merge campaigns with insights
  const metaMerged = metaCampaigns.map((c) => ({
    ...c,
    insights: metaInsights.find((i) => i.campaignId === c.id) ?? null,
  }));

  // ── Mutations ──────────────────────────────────────────────────────────────
  const updateStatus = trpc.campaigns.updateStatus.useMutation({
    onSuccess: () => { utils.campaigns.list.invalidate(); toast.success("Campaign status updated"); },
    onError: () => toast.error("Failed to update status"),
  });

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filteredLocal = localCampaigns.filter((c) =>
    (c.name ?? "").toLowerCase().includes(search.toLowerCase()) &&
    (filter === "all" || c.status === filter)
  );

  const filteredMeta = metaMerged.filter((c) =>
    (c.name ?? "").toLowerCase().includes(search.toLowerCase()) &&
    (filter === "all" || c.status?.toLowerCase() === filter || c.status === filter)
  );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5 animate-fade-in">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {tab === "meta"
                ? isConnected ? `${metaCampaigns.length} Meta campaigns` : "Connect Meta Ads to see campaigns"
                : `${localCampaigns.length} local campaigns`
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            {tab === "meta" && isConnected && (
              <button
                onClick={() => { refetchMeta(); refetchInsights(); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            )}
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Campaign
            </button>
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 glass rounded-xl p-1 w-fit">
          <button
            onClick={() => setTab("meta")}
            className={
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all " +
              (tab === "meta" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")
            }
          >
            <Facebook className="w-3.5 h-3.5" />
            Meta Ads
            {isConnected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />}
          </button>
          <button
            onClick={() => setTab("local")}
            className={
              "px-4 py-2 rounded-lg text-sm font-medium transition-all " +
              (tab === "local" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")
            }
          >
            Local
          </button>
        </div>

        {/* ── Filters ────────────────────────────────────────────────────────── */}
        <CampaignFilters
          search={search}
          onSearchChange={setSearch}
          filter={filter}
          onFilterChange={setFilter}
          showDatePreset={tab === "meta" && isConnected}
          datePreset={datePreset}
          onDatePresetChange={setDatePreset}
        />

        {/* ── Tables ─────────────────────────────────────────────────────────── */}
        {tab === "meta" && (
          <MetaCampaignTable
            campaigns={filteredMeta}
            loading={metaLoading || insightsLoading}
            isConnected={isConnected}
            onRowClick={setSelectedCampaign}
          />
        )}

        {tab === "local" && (
          <LocalCampaignTable
            campaigns={filteredLocal}
            loading={localLoading}
            onStatusChange={(id, status) => updateStatus.mutate({ campaignId: id, status: status as any })}
            onCreateNew={() => setShowCreate(true)}
          />
        )}
      </div>

      <CreateCampaignModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => utils.campaigns.list.invalidate()}
      />
      <CampaignDetailDrawer
        campaign={selectedCampaign}
        open={!!selectedCampaign}
        onClose={() => setSelectedCampaign(null)}
      />
    </DashboardLayout>
  );
}
