/**
 * CampaignPreview.tsx — Final campaign review before launch.
 * Shows approved creatives, content plan summary, budget, and launch confirmation.
 */
import { useState } from "react";
import { Rocket, CheckCircle2, AlertCircle, Calendar, DollarSign, Target, Globe } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { cn } from "@/core/lib/utils";
import type { Creative, ContentPlanItem, BudgetAllocation, CampaignBrief } from "./types";
import { PLATFORM_ICONS } from "./types";

interface Props {
  brief: CampaignBrief;
  approvedCreatives: Creative[];
  contentPlan: ContentPlanItem[];
  budgetAllocation: BudgetAllocation;
  onConfirm: () => void;
  isConfirming?: boolean;
}

export function CampaignPreview({
  brief,
  approvedCreatives,
  contentPlan,
  budgetAllocation,
  onConfirm,
  isConfirming = false,
}: Props) {
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = async () => {
    setConfirmed(true);
    onConfirm();
  };

  const platforms = brief.platforms ?? [];
  const totalBudget = brief.budget ?? 0;
  const currency = brief.currency ?? "SAR";

  // Validation checks
  const checks = [
    { label: "صور إعلانية موافق عليها", ok: approvedCreatives.length > 0, value: `${approvedCreatives.length} صورة` },
    { label: "خطة المحتوى", ok: contentPlan.length > 0, value: `${contentPlan.length} منشور` },
    { label: "الميزانية", ok: totalBudget > 0, value: `${totalBudget.toLocaleString()} ${currency}` },
    { label: "المنصات", ok: platforms.length > 0, value: platforms.join(", ") },
    { label: "الجمهور المستهدف", ok: !!brief.targetAudience, value: brief.targetAudience ?? "—" },
    { label: "البلد المستهدف", ok: !!brief.targetCountry, value: brief.targetCountry ?? "—" },
  ];

  const allChecked = checks.every(c => c.ok);

  return (
    <div className="space-y-5">
      {/* Campaign Header */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold">{brief.name ?? "حملة إعلانية جديدة"}</h2>
            <p className="text-gray-400 text-sm mt-0.5">{brief.product}</p>
          </div>
          <Badge className="bg-red-500/20 text-red-300 border border-red-500/30 text-xs">
            {brief.campaignType ?? "حملة"}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white/5 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
              <DollarSign className="w-3 h-3" />
              <span>الميزانية الإجمالية</span>
            </div>
            <p className="text-white font-bold text-lg">{totalBudget.toLocaleString()} {currency}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
              <Target className="w-3 h-3" />
              <span>هدف الحملة</span>
            </div>
            <p className="text-white font-semibold capitalize">{brief.objective ?? "awareness"}</p>
          </div>
          {brief.startDate && (
            <div className="bg-white/5 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
                <Calendar className="w-3 h-3" />
                <span>تاريخ البدء</span>
              </div>
              <p className="text-white font-semibold text-sm">{brief.startDate}</p>
            </div>
          )}
          <div className="bg-white/5 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
              <Globe className="w-3 h-3" />
              <span>البلد المستهدف</span>
            </div>
            <p className="text-white font-semibold text-sm">{brief.targetCountry ?? "—"}</p>
          </div>
        </div>

        {/* Platforms */}
        <div className="flex items-center gap-2 mt-3">
          {platforms.map(p => (
            <div key={p} className="flex items-center gap-1 bg-white/10 rounded-lg px-2 py-1">
              <span className="text-sm">{PLATFORM_ICONS[p] ?? "📱"}</span>
              <span className="text-xs text-gray-300 capitalize">{p}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Approved Creatives Preview */}
      {approvedCreatives.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-800 text-sm mb-2 flex items-center gap-2">
            <span>🎨</span>
            الصور الإعلانية المعتمدة ({approvedCreatives.length})
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {approvedCreatives.slice(0, 6).map(creative => (
              <div key={creative.id} className="relative rounded-xl overflow-hidden border border-green-200 bg-gray-50">
                <div style={{ aspectRatio: `${creative.width}/${creative.height}` }}>
                  <img
                    src={creative.watermarkedUrl}
                    alt={`${creative.platform} ${creative.format}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-1">
                  <p className="text-[9px] text-white capitalize">{creative.platform} · {creative.format}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validation Checklist */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-800 text-sm mb-3">التحقق من الحملة</h3>
        <div className="space-y-2">
          {checks.map(check => (
            <div key={check.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {check.ok
                  ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  : <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                }
                <span className="text-sm text-gray-700">{check.label}</span>
              </div>
              <span className={cn("text-xs", check.ok ? "text-gray-500" : "text-amber-600")}>
                {check.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Budget per platform */}
      {Object.keys(budgetAllocation).length > 0 && (
        <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
          <h3 className="font-semibold text-gray-800 text-sm mb-2 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-orange-600" />
            توزيع الميزانية النهائي
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(budgetAllocation).map(([platform, amount]) => (
              <div key={platform} className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{PLATFORM_ICONS[platform] ?? "📱"}</span>
                  <span className="text-xs text-gray-700 capitalize">{platform}</span>
                </div>
                <span className="text-xs font-semibold text-gray-800">{(amount as number).toLocaleString()} {currency}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Launch Button */}
      <div className="space-y-3">
        {!allChecked && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">بعض البيانات غير مكتملة. يمكنك المتابعة لكن تأكد من مراجعتها.</p>
          </div>
        )}

        <Button
          onClick={handleConfirm}
          disabled={isConfirming || confirmed}
          className={cn(
            "w-full py-4 rounded-2xl font-bold text-base shadow-xl transition-all duration-300",
            confirmed
              ? "bg-green-500 text-white shadow-green-200"
              : "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-red-200 hover:shadow-red-300 hover:scale-[1.01]",
          )}
        >
          {isConfirming ? (
            <span className="flex items-center gap-2 justify-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              جاري تأكيد الحملة...
            </span>
          ) : confirmed ? (
            <span className="flex items-center gap-2 justify-center">
              <CheckCircle2 className="w-5 h-5" />
              تم تأكيد الحملة!
            </span>
          ) : (
            <span className="flex items-center gap-2 justify-center">
              <Rocket className="w-5 h-5" />
              تأكيد وإطلاق الحملة 🚀
            </span>
          )}
        </Button>

        <p className="text-center text-xs text-gray-400">
          بالنقر على "تأكيد وإطلاق"، سيتم حفظ الحملة وجدولة المنشورات
        </p>
      </div>
    </div>
  );
}
