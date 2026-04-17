import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";
import { Toaster } from "@/components/ui/sonner";
import { safeStorage } from "@/lib/safeStorage";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 0,                    // Never retry failed queries — prevents error cascade loops
      refetchOnWindowFocus: false, // Don't refetch when user switches tabs
      staleTime: 30 * 1000,        // 30s stale time — reduces unnecessary requests
    },
    mutations: {
      retry: 0,
    },
  },
});
const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;
  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;
  if (!isUnauthorized) return;
  // Do NOT redirect if already on an auth page -- prevents redirect loops
  const currentPath = window.location.pathname;
  const authPaths = ["/login", "/register", "/signup"];
  if (authPaths.some(p => currentPath.startsWith(p))) return;
  // Do NOT redirect if user has a valid auth token in storage.
  // The 401 may be a race condition where protected queries fired before
  // auth.me resolved. The token is valid -- let the page re-render naturally.
  // Check both localStorage AND sessionStorage (safeStorage fallback).
  try {
    const token = safeStorage.getItem("authToken");
    if (token && token.length > 20) return;
  } catch (e) { /* ignore storage errors */ }
  window.location.href = "/login";
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
      headers() {
        // Send stored JWT as Authorization header on every request.
        // This is the fallback for mobile Safari and environments where
        // HttpOnly cookies are blocked (ITP, Private Browsing, cross-site).
        const token = safeStorage.getItem("authToken");
        if (token) {
          return { Authorization: `Bearer ${token}` };
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
      <App />
      <Toaster />
    </QueryClientProvider>
  </trpc.Provider>
);

