import { trpc } from "@/core/lib/trpc";
import "./core/i18n";
import { Toaster } from "sonner";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";
import { supabase } from "@/core/lib/supabase";
import { SupabaseAuthProvider } from "@/core/contexts/SupabaseAuthContext";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;
  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;
  if (!isUnauthorized) return;
  const currentPath = window.location.pathname;
  if (currentPath !== "/login" && !currentPath.startsWith("/auth/")) {
    window.location.href = `/login?returnTo=${encodeURIComponent(currentPath)}`;
  }
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
        if (supabase) {
          try {
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;
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
