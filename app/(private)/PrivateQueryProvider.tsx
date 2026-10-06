"use client";

import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { createPrivateQueryClient } from "./MonthlyTransactionsPanel/monthCache";

const SessionContext = createContext<{
  userId: string;
  rejectAccess: (status: number) => void;
} | null>(null);

export function PrivateQueryProvider({
  userId,
  children
}: {
  userId: string;
  children: ReactNode;
}) {
  const [client] = useState(createPrivateQueryClient);
  const rejectAccess = useCallback(
    (status: number) => {
      if (status !== 401 && status !== 403) return;
      client.clear();
      window.location.replace(
        status === 403 ? "/auth/sign-out?status=not-allowed" : "/login"
      );
    },
    [client]
  );
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (session && session.user.id !== userId))
        rejectAccess(401);
    });
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        client.clear();
        // A restored private page must recheck its cookie-backed server session.
        window.location.reload();
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener("pageshow", onPageShow);
      void client.cancelQueries();
    };
  }, [client, userId, rejectAccess]);
  return (
    <QueryClientProvider client={client}>
      <SessionContext.Provider value={{ userId, rejectAccess }}>
        {children}
      </SessionContext.Provider>
    </QueryClientProvider>
  );
}

export function usePrivateQuerySession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("PrivateQueryProvider is required.");
  return session;
}

export function PrivateSignOut({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  return (
    <form action="/auth/sign-out" method="post" onSubmit={() => client.clear()}>
      {children}
    </form>
  );
}
