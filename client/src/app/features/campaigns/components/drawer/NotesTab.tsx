/**
 * drawer/NotesTab.tsx — Notes & Tags management for campaigns.
 */
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { Tag, MessageSquare, X } from "lucide-react";

interface NotesTabProps {
  notes: string;
  onNotesChange: (value: string) => void;
  onNotesBlur: () => void;
  isSaving: boolean;
  tagInput: string;
  onTagInputChange: (value: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tagId: number) => void;
  savedTags: Array<{ id: number; tag: string }>;
}

export function NotesTab({
  notes, onNotesChange, onNotesBlur, isSaving,
  tagInput, onTagInputChange, onAddTag, onRemoveTag, savedTags,
}: NotesTabProps) {
  return (
    <div className="p-5 space-y-4">
      {/* Tags */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Tags</span>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {savedTags.length === 0 && <span className="text-xs text-muted-foreground">No tags yet. Add one below.</span>}
          {savedTags.map((t) => (
            <Badge key={t.id} variant="secondary" className="text-xs gap-1 pl-2 pr-1">
              {t.tag}
              <button onClick={() => onRemoveTag(t.id)} className="rounded-full p-0.5 hover:bg-foreground/10"><X className="w-2.5 h-2.5" /></button>
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={tagInput} onChange={(e) => onTagInputChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onAddTag(); }}
            placeholder="Add a tag..."
            className="flex-1 h-8 px-3 text-xs border border-input rounded-lg bg-transparent outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
          />
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onAddTag}>Add</Button>
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Notes</span>
        </div>
        <textarea
          value={notes} onChange={(e) => onNotesChange(e.target.value)} onBlur={onNotesBlur}
          placeholder="Add notes about this campaign..."
          className="w-full h-32 px-3 py-2 text-sm border border-input rounded-lg bg-transparent outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground resize-none"
        />
        <p className="text-[10px] text-muted-foreground mt-1.5">
          {isSaving ? "Saving..." : "Notes are auto-saved to your account."}
        </p>
      </div>
    </div>
  );
}
