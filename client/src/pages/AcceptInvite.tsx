// AcceptInvite.tsx
// Page shown when a user clicks an invitation link.
// Route: /invite/:token
import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/core/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/core/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Badge } from "@/core/components/ui/badge";
import { Loader2, Building2, CheckCircle2, XCircle, Users } from "lucide-react";
import { toast } from "sonner";

export default function AcceptInvite() {
  const [, params] = useRoute("/invite/:token");
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const token = params?.token ?? "";

  const [accepted, setAccepted] = useState(false);

  // Fetch invitation details (public)
  const { data: invitation, isLoading: invLoading, error: invError } = trpc.invitations.getByToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  const acceptMutation = trpc.invitations.accept.useMutation({
    onSuccess: (data) => {
      setAccepted(true);
      toast.success("You've joined the workspace!");
      setTimeout(() => navigate("/"), 2000);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleAccept = () => {
    if (!user) {
      // Redirect to login with return path
      // Store return path and redirect to login
      sessionStorage.setItem("invite_return", `/invite/${token}`);
      window.location.href = getLoginUrl();
      return;
    }
    acceptMutation.mutate({ token });
  };

  if (authLoading || invLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (invError || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid or has expired. Please ask the workspace admin to send a new invitation.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button variant="outline" onClick={() => navigate("/")}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invitation.status === "accepted") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <CardTitle>Already Accepted</CardTitle>
            <CardDescription>This invitation has already been accepted.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate("/")}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invitation.status === "revoked" || invitation.status === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>Invitation {invitation.status === "expired" ? "Expired" : "Revoked"}</CardTitle>
            <CardDescription>
              {invitation.status === "expired"
                ? "This invitation has expired. Please ask the workspace admin to send a new one."
                : "This invitation has been revoked by the workspace admin."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button variant="outline" onClick={() => navigate("/")}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <CardTitle>Welcome aboard!</CardTitle>
            <CardDescription>
              You've successfully joined <strong>{invitation.workspace?.name}</strong>. Redirecting to dashboard...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            {invitation.workspace?.logo_url ? (
              <img
                src={invitation.workspace.logo_url}
                alt={invitation.workspace.name}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <Building2 className="h-8 w-8 text-primary" />
            )}
          </div>
          <CardTitle>You're invited!</CardTitle>
          <CardDescription>
            You've been invited to join{" "}
            <strong className="text-foreground">{invitation.workspace?.name ?? "a workspace"}</strong>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Invitation details */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Workspace</span>
              <span className="font-medium">{invitation.workspace?.name}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Your role</span>
              <Badge variant="secondary" className="capitalize">{invitation.role}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Invited email</span>
              <span className="font-medium text-xs">{invitation.email}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Expires</span>
              <span className="text-xs text-muted-foreground">
                {new Date(invitation.expiresAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Auth notice if not logged in */}
          {!user && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
              You need to sign in to accept this invitation. You'll be redirected back after login.
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate("/")}
            >
              Decline
            </Button>
            <Button
              className="flex-1"
              onClick={handleAccept}
              disabled={acceptMutation.isPending}
            >
              {acceptMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Joining...</>
              ) : user ? (
                <><Users className="mr-2 h-4 w-4" /> Accept Invitation</>
              ) : (
                "Sign in to Accept"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
