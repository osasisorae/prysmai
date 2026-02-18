import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

type AuthUser = {
  id: number;
  email: string | null;
  name: string | null;
  role: string;
  onboarded: boolean | null;
  [key: string]: unknown;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/login" } =
    options ?? {};
  const utils = trpc.useUtils();

  // Use tRPC auth.me as primary (works for both Manus OAuth and custom auth via context.ts)
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Also check custom auth session
  const [customUser, setCustomUser] = useState<AuthUser | null>(null);
  const [customLoading, setCustomLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setCustomUser(data.user ?? null);
        setCustomLoading(false);
      })
      .catch(() => {
        setCustomUser(null);
        setCustomLoading(false);
      });
  }, []);

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      // Clear custom auth session
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      // Also clear tRPC/Manus session
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        // Already logged out from tRPC side, that's fine
      }
    } finally {
      utils.auth.me.setData(undefined, null);
      setCustomUser(null);
      await utils.auth.me.invalidate();
      window.location.href = "/login";
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    // Prefer tRPC user (works for both auth methods via context.ts), fall back to custom auth
    const user = meQuery.data ?? customUser ?? null;
    const loading = (meQuery.isLoading && customLoading) || logoutMutation.isPending;

    localStorage.setItem(
      "manus-runtime-user-info",
      JSON.stringify(user)
    );

    return {
      user,
      loading,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(user),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    customUser,
    customLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || customLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath;
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    customLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => {
      meQuery.refetch();
      // Also re-check custom auth
      fetch("/api/auth/me", { credentials: "include" })
        .then((res) => res.json())
        .then((data) => setCustomUser(data.user ?? null))
        .catch(() => setCustomUser(null));
    },
    logout,
  };
}
