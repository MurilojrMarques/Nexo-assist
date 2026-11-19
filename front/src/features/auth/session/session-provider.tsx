"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { request } from "@/lib/api/http";
import { createAuthApi } from "@/features/auth/api/auth-api";
import { SessionManager, type SessionSnapshot } from "./session-manager";

const SessionContext = createContext<SessionManager | null>(null);

type SessionProviderProps = {
  children: ReactNode;
  manager?: SessionManager;
};

export function SessionProvider({ children, manager }: SessionProviderProps) {
  const [instance] = useState(() => manager ?? new SessionManager({ auth: createAuthApi(request), request }));

  useEffect(() => {
    void instance.restore();
  }, [instance]);

  return <SessionContext.Provider value={instance}>{children}</SessionContext.Provider>;
}

export type Session = SessionSnapshot &
  Pick<SessionManager, "login" | "logout" | "authorizedRequest">;

export function useSession(): Session {
  const manager = useContext(SessionContext);

  if (!manager) {
    throw new Error("useSession precisa estar dentro de <SessionProvider>.");
  }

  const snapshot = useSyncExternalStore(manager.subscribe, manager.getSnapshot, manager.getSnapshot);

  return {
    ...snapshot,
    login: manager.login,
    logout: manager.logout,
    authorizedRequest: manager.authorizedRequest,
  };
}
