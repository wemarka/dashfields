/**
 * ConnectPlatformDialog — modal for connecting a new social media platform.
 * Routes to the existing Connections page for OAuth flows.
 */
import { X } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/core/components/ui/button";
import { cn } from "@/core/lib/utils";

interface ConnectPlatformDialogProps {
  onClose: () => void;
  onConnected: () => void;
}

const PLATFORMS = [
  { id: "facebook",  label: "Facebook",    color: "bg-neutral-800 border border-neutral-700", textColor: "text-white" },
  { id: "instagram", label: "Instagram",   color: "bg-neutral-700 border border-neutral-600", textColor: "text-white" },
  { id: "twitter",   label: "X (Twitter)", color: "bg-neutral-900 border border-neutral-700", textColor: "text-white" },
  { id: "linkedin",  label: "LinkedIn",    color: "bg-neutral-800 border border-neutral-700", textColor: "text-white" },
  { id: "youtube",   label: "YouTube",     color: "bg-brand",                                 textColor: "text-white" },
  { id: "tiktok",    label: "TikTok",      color: "bg-neutral-900 border border-neutral-700", textColor: "text-white" },
  { id: "snapchat",  label: "Snapchat",    color: "bg-neutral-700 border border-neutral-600", textColor: "text-white" },
  { id: "pinterest", label: "Pinterest",   color: "bg-brand",                                 textColor: "text-white" },
] as const;

export function ConnectPlatformDialog({ onClose }: ConnectPlatformDialogProps) {
  const [, setLocation] = useLocation();

  const handleSelectPlatform = () => {
    // Navigate to the existing connections page which handles OAuth
    setLocation("/connections");
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-foreground">Connect a Platform</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Platform grid */}
          <div className="p-6">
            <p className="text-sm text-muted-foreground mb-4">
              Select a platform to connect via the Integrations page.
            </p>
            <div className="grid grid-cols-4 gap-3">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={handleSelectPlatform}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border border-border",
                    "hover:border-primary/50 hover:bg-muted/50 transition-all duration-150 group"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold",
                    p.color, p.textColor
                  )}>
                    {p.label[0]}
                  </div>
                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors leading-tight text-center">
                    {p.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-5 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSelectPlatform}>Go to Integrations</Button>
          </div>
        </div>
      </div>
    </>
  );
}
