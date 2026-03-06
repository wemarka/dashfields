/**
 * team/components/InviteModal.tsx — Invite team member dialog.
 */
import { useState } from "react";
import { Mail, Link2, UserPlus, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/core/components/ui/dialog";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/core/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import { ROLE_CONFIG } from "./constants";

interface Props {
  open: boolean;
  onClose: () => void;
  workspaceId: number;
}

export function InviteModal({ open, onClose, workspaceId }: Props) {
  const [tab, setTab] = useState<"email" | "link">("email");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member" | "viewer">("member");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const addMutation = trpc.workspaces.addMemberByEmail.useMutation({
    onSuccess: () => { toast.success("Member added successfully"); utils.workspaces.listMembers.invalidate(); setEmail(""); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  const inviteMutation = trpc.invitations.invite.useMutation({
    onSuccess: (data) => { setGeneratedLink(data.inviteUrl); utils.invitations.list.invalidate(); toast.success("Invite link generated"); },
    onError: (e) => toast.error(e.message),
  });

  const copyLink = () => {
    if (generatedLink) { navigator.clipboard.writeText(generatedLink); toast.success("Link copied to clipboard"); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-brand" /> Invite Team Member</DialogTitle>
          <DialogDescription>Add someone to your workspace to collaborate on campaigns and content.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "email" | "link")}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="email" className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> By Email</TabsTrigger>
            <TabsTrigger value="link" className="flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" /> Invite Link</TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input id="invite-email" type="email" placeholder="colleague@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <p className="text-xs text-muted-foreground">The user must already have a Dashfields account.</p>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["admin", "member", "viewer"] as const).map((r) => {
                    const cfg = ROLE_CONFIG[r]; const Icon = cfg.icon;
                    return (
                      <SelectItem key={r} value={r}>
                        <div className="flex items-center gap-2"><Icon className={`w-3.5 h-3.5 ${cfg.color}`} /><span>{cfg.label}</span><span className="text-muted-foreground text-xs">— {cfg.description}</span></div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={() => addMutation.mutate({ workspaceId, email, role })} disabled={!email || addMutation.isPending}>
              {addMutation.isPending ? "Adding..." : "Add Member"}
            </Button>
          </TabsContent>

          <TabsContent value="link" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Recipient Email (for tracking)</Label>
              <Input type="email" placeholder="recipient@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["admin", "member", "viewer"] as const).map((r) => {
                    const cfg = ROLE_CONFIG[r]; const Icon = cfg.icon;
                    return (
                      <SelectItem key={r} value={r}>
                        <div className="flex items-center gap-2"><Icon className={`w-3.5 h-3.5 ${cfg.color}`} /><span>{cfg.label}</span></div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            {!generatedLink ? (
              <Button className="w-full" onClick={() => inviteMutation.mutate({ workspaceId, email, role, origin: window.location.origin })} disabled={!email || inviteMutation.isPending}>
                <Link2 className="w-4 h-4 mr-2" /> {inviteMutation.isPending ? "Generating..." : "Generate Invite Link"}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-brand/5 border border-brand/20">
                  <Link2 className="w-3.5 h-3.5 text-brand shrink-0" />
                  <span className="text-xs text-muted-foreground flex-1 truncate">{generatedLink}</span>
                  <button onClick={copyLink} className="p-1.5 rounded-lg hover:bg-brand/10 transition-colors"><Copy className="w-3.5 h-3.5 text-brand" /></button>
                </div>
                <p className="text-xs text-muted-foreground text-center">Link expires in 7 days. Share it securely.</p>
                <Button variant="outline" className="w-full" onClick={() => setGeneratedLink(null)}>
                  <RefreshCw className="w-3.5 h-3.5 mr-2" /> Generate New Link
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
