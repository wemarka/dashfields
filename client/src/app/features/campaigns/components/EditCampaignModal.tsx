/**
 * EditCampaignModal.tsx — Modal for editing a Meta campaign's name, status, and daily budget.
 */
import { useState, useEffect } from "react";
import { Loader2, Pencil } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/core/components/ui/dialog";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/core/components/ui/select";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import type { UnifiedCampaign } from "./campaign-table/types";

interface EditCampaignModalProps {
  campaign: UnifiedCampaign | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  accountId?: number;
}

export function EditCampaignModal({ campaign, open, onClose, onSuccess, accountId }: EditCampaignModalProps) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "PAUSED" | "">("");
  const [dailyBudget, setDailyBudget] = useState("");

  // Reset form when campaign changes
  useEffect(() => {
    if (campaign) {
      setName(campaign.name ?? "");
      const s = campaign.status?.toUpperCase();
      setStatus(s === "ACTIVE" || s === "PAUSED" ? s : "");
      setDailyBudget(campaign.dailyBudget ? String(campaign.dailyBudget) : "");
    }
  }, [campaign]);

  const utils = trpc.useUtils();
  const editMutation = trpc.meta.editMetaCampaign.useMutation({
    onSuccess: () => {
      toast.success("Campaign updated successfully");
      utils.meta.campaignInsights.invalidate();
      onSuccess?.();
      onClose();
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message ?? "Failed to update campaign");
    },
  });

  const handleSave = () => {
    if (!campaign) return;
    const updates: {
      campaignId: string;
      name?: string;
      status?: "ACTIVE" | "PAUSED";
      dailyBudget?: number;
      accountId?: number;
    } = { campaignId: campaign.id, accountId };

    if (name.trim() && name.trim() !== campaign.name) updates.name = name.trim();
    if (status && status !== campaign.status?.toUpperCase()) updates.status = status as "ACTIVE" | "PAUSED";
    const budgetNum = parseFloat(dailyBudget);
    if (!isNaN(budgetNum) && budgetNum > 0 && budgetNum !== campaign.dailyBudget) updates.dailyBudget = budgetNum;

    if (Object.keys(updates).length <= 2) {
      toast.info("No changes detected");
      return;
    }
    editMutation.mutate(updates);
  };

  if (!campaign) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md" style={{ background: "#212121", border: "1px solid #383838" }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-white">
            <Pencil className="w-4 h-4" style={{ color: "#e62020" }} />
            Edit Campaign
          </DialogTitle>
          <p className="text-xs mt-1" style={{ color: "#737373" }}>
            Changes are applied directly via Meta Ads API
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Campaign Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium" style={{ color: "#C8C8C8" }}>Campaign Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Campaign name"
              className="text-sm h-8"
              style={{ background: "#242424", border: "1px solid #333", color: "#fff" }}
            />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium" style={{ color: "#C8C8C8" }}>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as "ACTIVE" | "PAUSED")}>
              <SelectTrigger className="h-8 text-sm" style={{ background: "#242424", border: "1px solid #333", color: "#fff" }}>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent style={{ background: "#212121", border: "1px solid #383838" }}>
                <SelectItem value="ACTIVE" className="text-xs">
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]/14 inline-block" />
                    Active
                  </span>
                </SelectItem>
                <SelectItem value="PAUSED" className="text-xs">
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]/14 inline-block" />
                    Paused
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Daily Budget */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium" style={{ color: "#C8C8C8" }}>Daily Budget</Label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: "#737373" }}>$</span>
              <Input
                value={dailyBudget}
                onChange={(e) => setDailyBudget(e.target.value)}
                placeholder="0.00"
                type="number"
                min="1"
                step="0.01"
                className="text-sm h-8 pl-6"
                style={{ background: "#242424", border: "1px solid #333", color: "#fff" }}
              />
            </div>
            <p className="text-xs" style={{ color: "#525252" }}>
              Leave unchanged to keep current budget
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs h-7"
            style={{ background: "transparent", border: "1px solid #333", color: "#C8C8C8" }}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={editMutation.isPending}
            className="text-xs h-7"
            style={{ background: "#e62020", color: "#fff", border: "none" }}
          >
            {editMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
