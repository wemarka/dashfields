// ABTesting.tsx — A/B Testing Dashboard
// Create, manage, and analyze split tests across ad campaigns.
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Plus, Trash2, Play, Pause, Trophy, FlaskConical,
  TrendingUp, TrendingDown, Minus, BarChart3, Eye,
  MousePointerClick, Target, DollarSign, Loader2,
  ChevronRight, AlertCircle, CheckCircle2, Clock,
  Edit3, RefreshCw,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Variant {
  id: string;
  name: string;
  description?: string;
  headline?: string;
  body?: string;
  cta?: string;
  imageUrl?: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  reach: number;
}

type TestStatus = "draft" | "running" | "paused" | "completed";

interface ABTest {
  id: number;
  name: string;
  hypothesis?: string;
  platform: string;
  status: TestStatus;
  start_date?: string;
  end_date?: string;
  variants: Variant[];
  winner?: string;
  notes?: string;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcCTR(v: Variant) {
  return v.impressions > 0 ? (v.clicks / v.impressions) * 100 : 0;
}
function calcCVR(v: Variant) {
  return v.clicks > 0 ? (v.conversions / v.clicks) * 100 : 0;
}
function calcCPC(v: Variant) {
  return v.clicks > 0 ? v.spend / v.clicks : 0;
}
function calcCPM(v: Variant) {
  return v.impressions > 0 ? (v.spend / v.impressions) * 1000 : 0;
}
function fmtPct(n: number) { return n.toFixed(2) + "%"; }
function fmtMoney(n: number) { return "$" + n.toFixed(2); }
function fmtNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

const STATUS_CONFIG: Record<TestStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft:     { label: "Draft",     color: "bg-muted text-muted-foreground",   icon: Clock },
  running:   { label: "Running",   color: "bg-green-500/15 text-green-600",   icon: Play },
  paused:    { label: "Paused",    color: "bg-yellow-500/15 text-yellow-600", icon: Pause },
  completed: { label: "Completed", color: "bg-blue-500/15 text-blue-600",     icon: CheckCircle2 },
};

const PLATFORMS = ["facebook", "instagram", "tiktok", "linkedin", "twitter", "youtube", "snapchat"];

// ─── Metric Card ──────────────────────────────────────────────────────────────
function MetricCell({ label, value, isBest }: { label: string; value: string; isBest?: boolean }) {
  return (
    <div className={`text-center p-2 rounded-lg ${isBest ? "bg-green-500/10 ring-1 ring-green-500/30" : ""}`}>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-sm font-semibold ${isBest ? "text-green-600" : ""}`}>{value}</p>
      {isBest && <p className="text-[9px] text-green-600 font-medium">Best</p>}
    </div>
  );
}

// ─── Lift Badge ───────────────────────────────────────────────────────────────
function LiftBadge({ lift }: { lift: number }) {
  if (Math.abs(lift) < 0.1) return <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Minus className="w-3 h-3" />0%</span>;
  const positive = lift > 0;
  return (
    <span className={`text-xs font-medium flex items-center gap-0.5 ${positive ? "text-green-600" : "text-red-500"}`}>
      {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {positive ? "+" : ""}{lift.toFixed(1)}%
    </span>
  );
}

// ─── Create / Edit Modal ──────────────────────────────────────────────────────
function TestFormModal({
  open, onClose, editTest,
}: {
  open: boolean;
  onClose: () => void;
  editTest?: ABTest;
}) {

  const utils = trpc.useUtils();

  const [name, setName]             = useState(editTest?.name ?? "");
  const [hypothesis, setHypothesis] = useState(editTest?.hypothesis ?? "");
  const [platform, setPlatform]     = useState(editTest?.platform ?? "facebook");
  const [startDate, setStartDate]   = useState(editTest?.start_date?.split("T")[0] ?? "");
  const [endDate, setEndDate]       = useState(editTest?.end_date?.split("T")[0] ?? "");
  const [notes, setNotes]           = useState(editTest?.notes ?? "");
  const [variants, setVariants]     = useState<Variant[]>(
    editTest?.variants ?? [
      { id: "A", name: "Variant A", impressions: 0, clicks: 0, conversions: 0, spend: 0, reach: 0 },
      { id: "B", name: "Variant B", impressions: 0, clicks: 0, conversions: 0, spend: 0, reach: 0 },
    ]
  );

  const createMut = trpc.abTesting.create.useMutation({
    onSuccess: () => { utils.abTesting.list.invalidate(); toast.success("Test created"); onClose(); },
    onError:   (e) => toast.error(e.message),
  });
  const updateMut = trpc.abTesting.update.useMutation({
    onSuccess: () => { utils.abTesting.list.invalidate(); toast.success("Test updated"); onClose(); },
    onError:   (e) => toast.error(e.message),
  });

  function addVariant() {
    if (variants.length >= 5) return;
    const id = String.fromCharCode(65 + variants.length);
    setVariants(v => [...v, { id, name: `Variant ${id}`, impressions: 0, clicks: 0, conversions: 0, spend: 0, reach: 0 }]);
  }

  function removeVariant(idx: number) {
    if (variants.length <= 2) return;
    setVariants(v => v.filter((_, i) => i !== idx));
  }

  function updateVariant(idx: number, field: string, value: string) {
    setVariants(v => v.map((vr, i) => i === idx ? { ...vr, [field]: value } : vr));
  }

  function handleSubmit() {
    if (!name.trim()) return toast.error("Test name is required");
    const payload = { name, hypothesis, platform, startDate: startDate || undefined, endDate: endDate || undefined, variants, notes };
    if (editTest) {
      updateMut.mutate({ id: editTest.id, ...payload });
    } else {
      createMut.mutate(payload);
    }
  }

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            {editTest ? "Edit A/B Test" : "New A/B Test"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Test Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Headline CTA Test — Q1" />
            </div>
            <div className="space-y-1">
              <Label>Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Hypothesis</Label>
              <Textarea
                value={hypothesis}
                onChange={e => setHypothesis(e.target.value)}
                placeholder="e.g. Changing the CTA from 'Learn More' to 'Get Started' will increase CTR by 15%"
                rows={2}
              />
            </div>
          </div>

          <Separator />

          {/* Variants */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Variants ({variants.length}/5)</Label>
              <Button variant="outline" size="sm" onClick={addVariant} disabled={variants.length >= 5}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Variant
              </Button>
            </div>

            {variants.map((v, idx) => (
              <div key={v.id} className="border border-border rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">{v.id}</span>
                    <Input
                      value={v.name}
                      onChange={e => updateVariant(idx, "name", e.target.value)}
                      className="h-7 text-sm font-medium border-0 p-0 focus-visible:ring-0 w-40"
                    />
                  </div>
                  {variants.length > 2 && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeVariant(idx)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input value={v.headline ?? ""} onChange={e => updateVariant(idx, "headline", e.target.value)} placeholder="Headline" className="text-xs h-8" />
                  <Input value={v.cta ?? ""} onChange={e => updateVariant(idx, "cta", e.target.value)} placeholder="CTA Text" className="text-xs h-8" />
                  <Input value={v.body ?? ""} onChange={e => updateVariant(idx, "body", e.target.value)} placeholder="Body copy" className="text-xs h-8 col-span-2" />
                  <Input value={v.imageUrl ?? ""} onChange={e => updateVariant(idx, "imageUrl", e.target.value)} placeholder="Image URL (optional)" className="text-xs h-8 col-span-2" />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes..." rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {editTest ? "Save Changes" : "Create Test"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Metrics Entry Modal ──────────────────────────────────────────────────────
function MetricsModal({ test, onClose }: { test: ABTest; onClose: () => void }) {

  const utils = trpc.useUtils();
  const [metrics, setMetrics] = useState<Record<string, Partial<Variant>>>(
    Object.fromEntries(test.variants.map(v => [v.id, {
      impressions: v.impressions, clicks: v.clicks,
      conversions: v.conversions, spend: v.spend, reach: v.reach,
    }]))
  );

  const updateMut = trpc.abTesting.updateVariantMetrics.useMutation({
    onSuccess: () => utils.abTesting.list.invalidate(),
    onError:   (e) => toast.error(e.message),
  });

  async function handleSave() {
    for (const [variantId, m] of Object.entries(metrics)) {
      await updateMut.mutateAsync({ testId: test.id, variantId, metrics: m });
    }
    toast.success("Metrics updated");
    onClose();
  }

  function setField(variantId: string, field: string, value: string) {
    setMetrics(prev => ({
      ...prev,
      [variantId]: { ...prev[variantId], [field]: parseFloat(value) || 0 },
    }));
  }

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update Metrics — {test.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {test.variants.map(v => (
            <div key={v.id} className="border border-border rounded-xl p-3 space-y-2">
              <p className="font-semibold text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">{v.id}</span>
                {v.name}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(["impressions", "clicks", "conversions", "spend", "reach"] as const).map(field => (
                  <div key={field} className="space-y-0.5">
                    <Label className="text-xs capitalize">{field}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={metrics[v.id]?.[field] ?? 0}
                      onChange={e => setField(v.id, field, e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateMut.isPending}>
            {updateMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Metrics
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Test Detail Card ─────────────────────────────────────────────────────────
function TestCard({ test, onEdit, onMetrics }: { test: ABTest; onEdit: () => void; onMetrics: () => void }) {

  const utils = trpc.useUtils();
  const cfg = STATUS_CONFIG[test.status];
  const StatusIcon = cfg.icon;

  const deleteMut = trpc.abTesting.delete.useMutation({
    onSuccess: () => { utils.abTesting.list.invalidate(); toast.success("Test deleted"); },
  });
  const updateMut = trpc.abTesting.update.useMutation({
    onSuccess: () => utils.abTesting.list.invalidate(),
  });
  const winnerMut = trpc.abTesting.declareWinner.useMutation({
    onSuccess: () => { utils.abTesting.list.invalidate(); toast.success("Winner declared! 🏆"); },
  });

  function toggleStatus() {
    const next = test.status === "running" ? "paused" : "running";
    updateMut.mutate({ id: test.id, status: next });
  }

  // Find best variant per metric
  const bestCTR  = test.variants.reduce((a, b) => calcCTR(a)  >= calcCTR(b)  ? a : b, test.variants[0]);
  const bestCVR  = test.variants.reduce((a, b) => calcCVR(a)  >= calcCVR(b)  ? a : b, test.variants[0]);
  const bestCPC  = test.variants.reduce((a, b) => {
    const aCPC = calcCPC(a); const bCPC = calcCPC(b);
    if (aCPC === 0) return b; if (bCPC === 0) return a;
    return aCPC <= bCPC ? a : b;
  }, test.variants[0]);

  const controlVariant = test.variants[0];
  const totalImpressions = test.variants.reduce((s, v) => s + v.impressions, 0);

  return (
    <Card className="glass border-border/50 hover:border-primary/30 transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={`text-xs px-2 py-0.5 ${cfg.color}`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {cfg.label}
              </Badge>
              <Badge variant="outline" className="text-xs capitalize">{test.platform}</Badge>
              {test.winner && (
                <Badge className="text-xs bg-yellow-500/15 text-yellow-600">
                  <Trophy className="w-3 h-3 mr-1" /> Winner: {test.variants.find(v => v.id === test.winner)?.name ?? test.winner}
                </Badge>
              )}
            </div>
            <CardTitle className="text-base leading-snug">{test.name}</CardTitle>
            {test.hypothesis && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{test.hypothesis}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
              <Edit3 className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMetrics}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            {test.status !== "completed" && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleStatus} disabled={updateMut.isPending}>
                {test.status === "running" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteMut.mutate({ id: test.id })}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Variant comparison table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-1.5 pr-3 text-muted-foreground font-medium">Variant</th>
                <th className="text-center py-1.5 px-2 text-muted-foreground font-medium">
                  <span className="flex items-center justify-center gap-1"><Eye className="w-3 h-3" />Impr.</span>
                </th>
                <th className="text-center py-1.5 px-2 text-muted-foreground font-medium">
                  <span className="flex items-center justify-center gap-1"><MousePointerClick className="w-3 h-3" />CTR</span>
                </th>
                <th className="text-center py-1.5 px-2 text-muted-foreground font-medium">
                  <span className="flex items-center justify-center gap-1"><Target className="w-3 h-3" />CVR</span>
                </th>
                <th className="text-center py-1.5 px-2 text-muted-foreground font-medium">
                  <span className="flex items-center justify-center gap-1"><DollarSign className="w-3 h-3" />CPC</span>
                </th>
                <th className="text-center py-1.5 px-2 text-muted-foreground font-medium">Lift vs A</th>
                {test.status === "running" && <th className="text-center py-1.5 pl-2 text-muted-foreground font-medium">Action</th>}
              </tr>
            </thead>
            <tbody>
              {test.variants.map((v, idx) => {
                const ctr  = calcCTR(v);
                const cvr  = calcCVR(v);
                const cpc  = calcCPC(v);
                const controlCTR = calcCTR(controlVariant);
                const lift = controlCTR > 0 ? ((ctr - controlCTR) / controlCTR) * 100 : 0;
                const isWinner = test.winner === v.id;
                const share = totalImpressions > 0 ? (v.impressions / totalImpressions) * 100 : 0;

                return (
                  <tr key={v.id} className={`border-b border-border/30 ${isWinner ? "bg-yellow-500/5" : ""}`}>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${isWinner ? "bg-yellow-500/20 text-yellow-600" : "bg-primary/10 text-primary"}`}>
                          {isWinner ? "🏆" : v.id}
                        </span>
                        <div>
                          <p className="font-medium leading-none">{v.name}</p>
                          {v.headline && <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{v.headline}</p>}
                        </div>
                      </div>
                      <div className="mt-1">
                        <Progress value={share} className="h-1 w-24" />
                        <span className="text-[9px] text-muted-foreground">{share.toFixed(0)}% traffic</span>
                      </div>
                    </td>
                    <td className="text-center py-2 px-2">{fmtNum(v.impressions)}</td>
                    <td className="text-center py-2 px-2">
                      <MetricCell label="" value={fmtPct(ctr)} isBest={v.id === bestCTR.id && ctr > 0} />
                    </td>
                    <td className="text-center py-2 px-2">
                      <MetricCell label="" value={fmtPct(cvr)} isBest={v.id === bestCVR.id && cvr > 0} />
                    </td>
                    <td className="text-center py-2 px-2">
                      <MetricCell label="" value={cpc > 0 ? fmtMoney(cpc) : "—"} isBest={v.id === bestCPC.id && cpc > 0} />
                    </td>
                    <td className="text-center py-2 px-2">
                      {idx === 0 ? <span className="text-xs text-muted-foreground">Control</span> : <LiftBadge lift={lift} />}
                    </td>
                    {test.status === "running" && (
                      <td className="text-center py-2 pl-2">
                        <Button
                          variant="ghost" size="sm"
                          className="h-6 text-[10px] text-yellow-600 hover:text-yellow-700 hover:bg-yellow-500/10"
                          onClick={() => winnerMut.mutate({ testId: test.id, variantId: v.id })}
                          disabled={winnerMut.isPending}
                        >
                          <Trophy className="w-3 h-3 mr-0.5" /> Declare
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Statistical significance */}
        {test.variants.length >= 2 && test.variants[0].impressions > 0 && test.variants[1].impressions > 0 && (
          <SignificanceBar control={test.variants[0]} variant={test.variants[1]} />
        )}
      </CardContent>
    </Card>
  );
}

// ─── Significance Bar ─────────────────────────────────────────────────────────
function SignificanceBar({ control, variant }: { control: Variant; variant: Variant }) {
  const { data } = trpc.abTesting.calculateSignificance.useQuery({
    controlImpressions:  control.impressions,
    controlConversions:  control.conversions,
    variantImpressions:  variant.impressions,
    variantConversions:  variant.conversions,
  }, { enabled: control.impressions > 0 && variant.impressions > 0 });

  if (!data) return null;

  return (
    <div className={`rounded-xl p-3 text-xs flex items-center gap-3 ${data.significant ? "bg-green-500/10 border border-green-500/20" : "bg-muted/50 border border-border/50"}`}>
      {data.significant
        ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
        : <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0" />
      }
      <div className="flex-1">
        <p className={`font-semibold ${data.significant ? "text-green-700" : "text-muted-foreground"}`}>
          {data.significant ? "Statistically Significant" : "Not Yet Significant"}
        </p>
        <p className="text-muted-foreground">
          Confidence: <strong>{data.confidence.toFixed(1)}%</strong> &nbsp;·&nbsp;
          {variant.name} CVR: <strong>{data.variantCVR}%</strong> vs Control: <strong>{data.controlCVR}%</strong> &nbsp;·&nbsp;
          Lift: <strong className={data.lift > 0 ? "text-green-600" : "text-red-500"}>{data.lift > 0 ? "+" : ""}{data.lift}%</strong>
        </p>
      </div>
      <div className="text-right shrink-0">
        <Progress value={data.confidence} className="w-20 h-2" />
        <p className="text-[10px] text-muted-foreground mt-0.5">p = {data.pValue}</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ABTesting() {
  const [showCreate, setShowCreate]     = useState(false);
  const [editTest, setEditTest]         = useState<ABTest | undefined>();
  const [metricsTest, setMetricsTest]   = useState<ABTest | undefined>();
  const [statusFilter, setStatusFilter] = useState<TestStatus | "all">("all");

  const { data: tests = [], isLoading } = trpc.abTesting.list.useQuery();

  const filtered = useMemo(() =>
    statusFilter === "all" ? (tests as ABTest[]) : (tests as ABTest[]).filter(t => t.status === statusFilter),
    [tests, statusFilter]
  );

  const counts = useMemo(() => ({
    all:       tests.length,
    running:   (tests as ABTest[]).filter(t => t.status === "running").length,
    draft:     (tests as ABTest[]).filter(t => t.status === "draft").length,
    completed: (tests as ABTest[]).filter(t => t.status === "completed").length,
  }), [tests]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FlaskConical className="w-6 h-6 text-primary" />
              A/B Testing
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Split-test your ads and find statistically significant winners
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Test
          </Button>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Tests",  value: counts.all,       icon: BarChart3,  color: "text-primary" },
            { label: "Running",      value: counts.running,   icon: Play,       color: "text-green-600" },
            { label: "Drafts",       value: counts.draft,     icon: Clock,      color: "text-yellow-600" },
            { label: "Completed",    value: counts.completed, icon: CheckCircle2, color: "text-blue-600" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="glass border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-current/10 ${color}`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 glass rounded-xl p-1 w-fit">
          {(["all", "running", "draft", "paused", "completed"] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                statusFilter === s ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s} {s !== "all" && counts[s as keyof typeof counts] !== undefined ? `(${counts[s as keyof typeof counts]})` : ""}
            </button>
          ))}
        </div>

        {/* Tests Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <FlaskConical className="w-12 h-12 text-muted-foreground/40 mx-auto" />
            <p className="text-lg font-semibold text-muted-foreground">No tests yet</p>
            <p className="text-sm text-muted-foreground">Create your first A/B test to start optimizing your ads</p>
            <Button onClick={() => setShowCreate(true)} className="mt-2">
              <Plus className="w-4 h-4 mr-2" /> Create First Test
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {(filtered as ABTest[]).map((test) => (
              <TestCard
                key={test.id}
                test={test}
                onEdit={() => setEditTest(test)}
                onMetrics={() => setMetricsTest(test)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && <TestFormModal open onClose={() => setShowCreate(false)} />}
      {editTest   && <TestFormModal open editTest={editTest} onClose={() => setEditTest(undefined)} />}
      {metricsTest && <MetricsModal test={metricsTest} onClose={() => setMetricsTest(undefined)} />}
    </DashboardLayout>
  );
}
