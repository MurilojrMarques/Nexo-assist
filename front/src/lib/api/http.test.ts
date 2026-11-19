import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./api-error";
import { request } from "./http";

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("request", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3333/api/");
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("chama a API com cookies, sem cache e com o token Bearer", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));

    await request("/auth/me", { token: "abc.def.ghi" });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("http://localhost:3333/api/auth/me");
    expect(init).toMatchObject({ method: "GET", credentials: "include", cache: "no-store" });
    expect(init?.headers).toMatchObject({ Authorization: "Bearer abc.def.ghi" });
  });

  it("envia o corpo como JSON", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await request("/auth/login", { method: "POST", body: { email: "a@nexo.com.br" } });

    const init = fetchMock.mock.calls[0]![1];
    expect(init?.body).toBe('{"email":"a@nexo.com.br"}');
    expect(init?.headers).toMatchObject({ "Content-Type": "application/json" });
    expect(init?.headers).not.toHaveProperty("Authorization");
  });

  it("transforma a resposta de erro da API em ApiError", async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { error: { code: "UNAUTHORIZED", message: "E-mail ou senha inválidos." } }));

    await expect(request("/auth/login", { method: "POST", body: {} })).rejects.toEqual(
      new ApiError(401, "UNAUTHORIZED", "E-mail ou senha inválidos."),
    );
  });

  it("transforma falha de rede em NETWORK_ERROR", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(request("/auth/refresh", { method: "POST" })).rejects.toMatchObject({ status: 0, code: "NETWORK_ERROR" });
  });

  it("aceita respostas sem corpo", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(request("/auth/logout", { method: "POST" })).resolves.toBeUndefined();
  });
});
