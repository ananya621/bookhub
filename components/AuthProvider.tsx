"use client";

import { createContext, useContext } from "react";
import type { CurrentUser } from "@/lib/auth";

/*
 * Distributes the signed-in user from the root layout (a server
 * component, which reads the session) down to client components.
 *
 * Client components must NOT work out who is signed in themselves.
 * The server renders the HTML with the user already resolved and the
 * same value is serialised into this provider, so the hydration render
 * matches. Reading a cookie or localStorage during a client render is
 * what caused the theme-toggle hydration mismatch; auth would fail the
 * same way, and more visibly, since it changes the whole nav.
 *
 * Server components should call getCurrentUser() directly instead of
 * using this.
 */

type Session = { user: CurrentUser | null };

const SessionContext = createContext<Session | null>(null);

export function AuthProvider({
  user,
  children,
}: {
  user: CurrentUser | null;
  children: React.ReactNode;
}) {
  return <SessionContext.Provider value={{ user }}>{children}</SessionContext.Provider>;
}

function useSession(): Session {
  const s = useContext(SessionContext);
  if (!s) throw new Error("useSession must be used inside AuthProvider");
  return s;
}

/** null means signed out. */
export const useCurrentUser = () => useSession().user;
