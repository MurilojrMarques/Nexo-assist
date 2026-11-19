import { ApiError, isApiError } from "@/lib/api/api-error";
import { openStream, type RequestFn, type RequestOptions, type StreamFn } from "@/lib/api/http";
import type { AuthApi } from "@/features/auth/api/auth-api";
import type { AuthSession, SessionUser } from "@/features/auth/types";

export type SessionStatus = "loading" | "authenticated" | "unauthenticated";

export type SessionSnapshot = {
  status: SessionStatus;
  user: SessionUser | null;
};

export type SessionManagerDependencies = {
  auth: AuthApi;
  request: RequestFn;
  stream?: StreamFn;
  wait?: (ms: number) => Promise<void>;
};

const RACE_RETRY_DELAY_MS = 300;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class SessionManager {
  private snapshot: SessionSnapshot = { status: "loading", user: null };
  private accessToken: string | null = null;
  private refreshInFlight: Promise<boolean> | null = null;
  private readonly listeners = new Set<() => void>();
  private readonly wait: (ms: number) => Promise<void>;
  private readonly stream: StreamFn;

  constructor(private readonly deps: SessionManagerDependencies) {
    this.wait = deps.wait ?? sleep;
    this.stream = deps.stream ?? openStream;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): SessionSnapshot => this.snapshot;

  restore = async (): Promise<void> => {
    if (this.snapshot.status === "loading") {
      await this.refresh();
    }
  };

  login = async (email: string, password: string): Promise<SessionUser> => {
    const session = await this.deps.auth.login(email, password);
    this.establish(session);
    return session.user;
  };

  logout = async (): Promise<void> => {
    const token = this.accessToken;
    this.clear();

    if (token) {
      await this.deps.auth.logout(token).catch(() => undefined);
    }
  };

  refresh = (): Promise<boolean> => {
    this.refreshInFlight ??= this.performRefresh().finally(() => {
      this.refreshInFlight = null;
    });

    return this.refreshInFlight;
  };

  authorizedRequest = <T>(path: string, options: Omit<RequestOptions, "token"> = {}): Promise<T> =>
    this.withToken((token) => this.deps.request<T>(path, { ...options, token }));

  authorizedStream = (path: string, options: Omit<RequestOptions, "token"> = {}): Promise<Response> =>
    this.withToken((token) => this.stream(path, { ...options, token }));

  private async withToken<T>(call: (token: string | null) => Promise<T>): Promise<T> {
    if (!this.accessToken && !(await this.refresh())) {
      throw new ApiError(401, "UNAUTHORIZED", "Sessão expirada. Entre novamente.");
    }

    try {
      return await call(this.accessToken);
    } catch (error) {
      if (isApiError(error) && error.status === 401 && (await this.refresh())) {
        return call(this.accessToken);
      }

      throw error;
    }
  }

  private async performRefresh(): Promise<boolean> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        this.establish(await this.deps.auth.refresh());
        return true;
      } catch (error) {
        if (!isApiError(error, "REFRESH_TOKEN_RACE")) {
          break;
        }

        await this.wait(RACE_RETRY_DELAY_MS);
      }
    }

    this.clear();
    return false;
  }

  private establish(session: AuthSession): void {
    this.accessToken = session.accessToken;
    this.setSnapshot({ status: "authenticated", user: session.user });
  }

  private clear(): void {
    this.accessToken = null;
    this.setSnapshot({ status: "unauthenticated", user: null });
  }

  private setSnapshot(snapshot: SessionSnapshot): void {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener());
  }
}
