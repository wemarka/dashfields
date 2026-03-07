import { trpc } from "@/core/lib/trpc";
import "./core/i18n";
import { Toaster } from "sonner";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { navigate as wouterNavigate } from "wouter/use-browser-location";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";
import { supabase } from "@/core/lib/supabase";
import { SupabaseAuthProvider } from "@/core/contexts/SupabaseAuthContext";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = async (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;
  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;
  if (!isUnauthorized) return;
  const currentPath = window.location.pathname;
  if (currentPath === "/login" || currentPath.startsWith("/auth/")) return;
  // Only redirect if there is genuinely no Supabase session
  // (avoids false redirects during session initialization)
  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) return; // session exists — 401 is transient, don't redirect
    } catch {
      // ignore
    }
  }
  // Use wouter's navigate for SPA routing (avoids full page reload)
  wouterNavigate(`/login?returnTo=${encodeURIComponent(currentPath)}`);
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      async headers() {
        // Attach Supabase access token as Bearer if available
        // Auto-refresh if token is expired or about to expire
        if (supabase) {
          try {
            const { data } = await supabase.auth.getSession();
            let session = data.session;
            if (session) {
              // Check if token expires within the next 60 seconds
              const expiresAt = session.expires_at ?? 0;
              const nowSecs = Math.floor(Date.now() / 1000);
              if (expiresAt - nowSecs < 60) {
                // Token expired or about to expire — refresh it
                const { data: refreshed } = await supabase.auth.refreshSession();
                session = refreshed.session;
              }
            }
            const token = session?.access_token;
            if (token) {
              return { Authorization: `Bearer ${token}` };
            }
          } catch {
            // ignore — no session available
          }
        }
        return {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <SupabaseAuthProvider>
        <App />
        <Toaster position="bottom-right" richColors />
      </SupabaseAuthProvider>
    </QueryClientProvider>
  </trpc.Provider>
);
