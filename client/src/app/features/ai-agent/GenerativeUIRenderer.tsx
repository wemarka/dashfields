import { cn } from "@/core/lib/utils";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { Progress } from "@/core/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  BarChart3,
  Target,
  MousePointerClick,
  Repeat2,
} from "lucide-react";
import type {
  UIBlock,
  MetricCardBlock,
  DataTableBlock,
  BarChartBlock,
  ProgressCardBlock,
  ActionButtonsBlock,
  InfoCardBlock,
  ImageGalleryBlock,
  StatusListBlock,
  CampaignSummaryBlock,
  SuggestionChipsBlock,
  CampaignPreviewBlock,
} from "./types";
import { CampaignPreview } from "./CampaignPreview";

// ── Props ──────────────────────────────────────────────────────────────────
interface GenerativeUIRendererProps {
  blocks: UIBlock[];
  onAction?: (action: string) => void;
  onChipClick?: (chip: string) => void;
  /** Called when a block is updated (e.g., image generated) — parent persists the change */
  onBlockUpdate?: (blockIndex: number, updatedBlock: UIBlock) => void;
}

export function GenerativeUIRenderer({ blocks, onAction, onChipClick, onBlockUpdate }: GenerativeUIRendererProps) {
  if (!blocks.length) return null;
  return (
    <div className="flex flex-col gap-3 mt-3">
      {blocks.map((block, i) => (
        <BlockRenderer key={i} block={block} blockIndex={i} onAction={onAction} onChipClick={onChipClick} onBlockUpdate={onBlockUpdate} />
      ))}
    </div>
  );
}

function BlockRenderer({
  block,
  blockIndex,
  onAction,
  onChipClick,
  onBlockUpdate,
}: {
  block: UIBlock;
  blockIndex: number;
  onAction?: (a: string) => void;
  onChipClick?: (c: string) => void;
  onBlockUpdate?: (blockIndex: number, updatedBlock: UIBlock) => void;
}) {
  switch (block.type) {
    case "metric_card":
      return <MetricCard block={block} />;
    case "data_table":
      return <DataTable block={block} />;
    case "bar_chart":
      return <SimpleBarChart block={block} />;
    case "progress_card":
      return <ProgressCard block={block} />;
    case "action_buttons":
      return <ActionButtons block={block} onAction={onAction} />;
    case "info_card":
      return <InfoCard block={block} />;
    case "image_gallery":
      return <ImageGallery block={block} />;
    case "status_list":
      return <StatusList block={block} />;
    case "campaign_summary":
      return <CampaignSummary block={block} />;
    case "suggestion_chips":
      return <SuggestionChips block={block} onChipClick={onChipClick} />;
    case "campaign_preview":
      return (
        <CampaignPreview
          block={block}
          onImageGenerated={(imageUrl) => {
            if (onBlockUpdate) {
              onBlockUpdate(blockIndex, { ...block, generated_image_url: imageUrl });
            }
          }}
        />
      );
    default:
      return null;
  }
}

// ── Metric Card ────────────────────────────────────────────────────────────
function MetricCard({ block }: { block: MetricCardBlock }) {
  const changeIcon =
    block.changeType === "positive" ? <TrendingUp className="w-3.5 h-3.5" /> :
    block.changeType === "negative" ? <TrendingDown className="w-3.5 h-3.5" /> :
    <Minus className="w-3.5 h-3.5" />;

  const changeColor =
    block.changeType === "positive" ? "text-emerald-500" :
    block.changeType === "negative" ? "text-brand-red" :
    "text-neutral-500";

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide">{block.title}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-white">{block.value}</span>
        {block.change && (
          <span className={cn("flex items-center gap-0.5 text-xs font-medium pb-0.5", changeColor)}>
            {changeIcon} {block.change}
          </span>
        )}
      </div>
      {block.subtitle && <span className="text-xs text-neutral-500 mt-1 block">{block.subtitle}</span>}
    </div>
  );
}

// ── Data Table ─────────────────────────────────────────────────────────────
function DataTable({ block }: { block: DataTableBlock }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
      {block.title && (
        <div className="px-4 py-2.5 border-b border-neutral-800">
          <span className="text-sm font-semibold text-neutral-300">{block.title}</span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-800/60">
              {block.columns.map((col, i) => (
                <th key={i} className="px-4 py-2.5 text-start text-xs font-medium text-neutral-400 uppercase tracking-wide">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, ri) => (
              <tr key={ri} className="border-t border-neutral-800 hover:bg-neutral-800/40 transition-colors">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-4 py-2.5 text-neutral-300">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Simple Bar Chart ───────────────────────────────────────────────────────
function SimpleBarChart({ block }: { block: BarChartBlock }) {
  const max = Math.max(...block.values, 1);
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      {block.title && <span className="text-sm font-semibold text-neutral-300 mb-3 block">{block.title}</span>}
      <div className="space-y-2.5">
        {block.labels.map((label, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-neutral-400 w-24 shrink-0 truncate">{label}</span>
            <div className="flex-1 h-6 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(block.values[i] / max) * 100}%`,
                  background: block.color || "linear-gradient(90deg, #E62020, #ff4444)",
                }}
              />
            </div>
            <span className="text-xs font-medium text-neutral-300 w-12 text-end">{block.values[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Progress Card ──────────────────────────────────────────────────────────
function ProgressCard({ block }: { block: ProgressCardBlock }) {
  const pct = block.total > 0 ? Math.round((block.current / block.total) * 100) : 0;
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-neutral-300">{block.title}</span>
        <span className="text-xs font-medium text-neutral-400">{pct}%</span>
      </div>
      <Progress value={pct} className="h-2" />
      <span className="text-xs text-neutral-500 mt-1.5 block">
        {block.current} / {block.total} {block.unit || ""}
      </span>
    </div>
  );
}

// ── Action Buttons ─────────────────────────────────────────────────────────
function ActionButtons({ block, onAction }: { block: ActionButtonsBlock; onAction?: (a: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {block.buttons.map((btn, i) => (
        <Button
          key={i}
          variant={btn.variant || "outline"}
          size="sm"
          className={cn(
            "rounded-lg text-xs",
            btn.variant === "default" && "bg-brand-red text-white hover:bg-brand-red/90",
          )}
          onClick={() => onAction?.(btn.action)}
        >
          {btn.label}
        </Button>
      ))}
    </div>
  );
}

// ── Info Card ──────────────────────────────────────────────────────────────
function InfoCard({ block }: { block: InfoCardBlock }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
      {block.image && (
        <div className="h-36 overflow-hidden">
          <img src={block.image} alt={block.title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4">
        <h4 className="text-sm font-semibold text-white mb-1">{block.title}</h4>
        <p className="text-xs text-neutral-400 leading-relaxed">{block.description}</p>
        {block.badges && block.badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {block.badges.map((b, i) => (
              <Badge key={i} variant="secondary" className="text-[10px] font-medium bg-neutral-800 text-neutral-300 border-neutral-700">{b}</Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Image Gallery ──────────────────────────────────────────────────────────
function ImageGallery({ block }: { block: ImageGalleryBlock }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      {block.title && <span className="text-sm font-semibold text-neutral-300 mb-3 block">{block.title}</span>}
      <div className="grid grid-cols-2 gap-2">
        {block.images.map((img, i) => (
          <div key={i} className="rounded-lg overflow-hidden bg-neutral-800">
            <img src={img.url} alt={img.caption || ""} className="w-full h-32 object-cover" />
            {img.caption && <span className="text-[10px] text-neutral-400 px-2 py-1 block">{img.caption}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Status List ────────────────────────────────────────────────────────────
function StatusList({ block }: { block: StatusListBlock }) {
  const statusIcon = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
    error: <XCircle className="w-4 h-4 text-brand-red" />,
    pending: <Clock className="w-4 h-4 text-neutral-500" />,
  };
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900">
      {block.title && (
        <div className="px-4 py-2.5 border-b border-neutral-800">
          <span className="text-sm font-semibold text-neutral-300">{block.title}</span>
        </div>
      )}
      <div className="divide-y divide-neutral-800">
        {block.items.map((item, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            {statusIcon[item.status]}
            <div className="flex-1 min-w-0">
              <span className="text-sm text-neutral-300 block">{item.label}</span>
              {item.detail && <span className="text-xs text-neutral-500">{item.detail}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Campaign Summary ───────────────────────────────────────────────────────
function CampaignSummary({ block }: { block: CampaignSummaryBlock }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-white">{block.name}</h4>
        <Badge variant="secondary" className="text-[10px] bg-neutral-800 text-neutral-300 border-neutral-700">{block.status}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {block.budget && (
          <div className="flex items-center gap-2">
            <BarChart3 className="w-3.5 h-3.5 text-neutral-500" />
            <div>
              <span className="text-[10px] text-neutral-500 block">Budget</span>
              <span className="text-xs font-medium text-neutral-300">{block.budget}</span>
            </div>
          </div>
        )}
        {block.reach && (
          <div className="flex items-center gap-2">
            <Target className="w-3.5 h-3.5 text-neutral-500" />
            <div>
              <span className="text-[10px] text-neutral-500 block">Reach</span>
              <span className="text-xs font-medium text-neutral-300">{block.reach}</span>
            </div>
          </div>
        )}
        {block.clicks && (
          <div className="flex items-center gap-2">
            <MousePointerClick className="w-3.5 h-3.5 text-neutral-500" />
            <div>
              <span className="text-[10px] text-neutral-500 block">Clicks</span>
              <span className="text-xs font-medium text-neutral-300">{block.clicks}</span>
            </div>
          </div>
        )}
        {block.conversions && (
          <div className="flex items-center gap-2">
            <Repeat2 className="w-3.5 h-3.5 text-neutral-500" />
            <div>
              <span className="text-[10px] text-neutral-500 block">Conversions</span>
              <span className="text-xs font-medium text-neutral-300">{block.conversions}</span>
            </div>
          </div>
        )}
      </div>
      {block.platforms && block.platforms.length > 0 && (
        <div className="flex gap-1.5 mt-3 pt-3 border-t border-neutral-800">
          {block.platforms.map((p, i) => (
            <Badge key={i} variant="outline" className="text-[10px] border-neutral-700 text-neutral-400">{p}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Suggestion Chips ───────────────────────────────────────────────────────
function SuggestionChips({ block, onChipClick }: { block: SuggestionChipsBlock; onChipClick?: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {block.chips.map((chip, i) => (
        <button
          key={i}
          onClick={() => onChipClick?.(chip)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
            "border border-neutral-800 bg-neutral-900 text-neutral-300",
            "hover:border-neutral-700 hover:bg-neutral-800 hover:text-white",
            "active:scale-95",
          )}
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
