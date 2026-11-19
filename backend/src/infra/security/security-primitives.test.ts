import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { Argon2PasswordHasher } from "./argon2-password-hasher.js";
import { JoseAccessTokenService } from "./jose-access-token-service.js";
import { generateOpaqueToken, hashOpaqueToken } from "./opaque-token.js";

const settings = {
  secret: "s".repeat(48),
  issuer: "nexo-assist-api",
  audience: "nexo-assist-web",
  ttlSeconds: 900,
};

const claims = {
  userId: "0196f6d2-5a7a-7c4a-9d0e-2b1f3c4d5e6f",
  role: "EMPLOYEE" as const,
  sessionId: "0196f6d2-5a7a-7c4a-9d0e-2b1f3c4d5e70",
};

describe("Argon2PasswordHasher", () => {
  const hasher = new Argon2PasswordHasher();

  it("gera hash argon2id com sal e confere a senha certa", async () => {
    const first = await hasher.hash("Senha-Forte-123");
    const second = await hasher.hash("Senha-Forte-123");

    expect(first).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(first).not.toBe(second);
    expect(await hasher.verify(first, "Senha-Forte-123")).toBe(true);
    expect(await hasher.verify(first, "senha-forte-123")).toBe(false);
  });

  it("trata hash corrompido como senha inválida, sem lançar erro", async () => {
    expect(await hasher.verify("não-é-um-hash", "qualquer")).toBe(false);
  });

  it("pede rehash de hashes com parâmetros mais fracos", async () => {
    const weak = "$argon2id$v=19$m=4096,t=1,p=1$c29tZXNhbHQ$aGFzaGhhc2hoYXNoaGFzaA";
    expect(hasher.needsRehash(weak)).toBe(true);
    expect(hasher.needsRehash(await hasher.hash("x"))).toBe(false);
  });
});

describe("opaque-token", () => {
  it("gera tokens de 256 bits únicos e guarda só o SHA-256", () => {
    const token = generateOpaqueToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generateOpaqueToken()).not.toBe(token);
    expect(hashOpaqueToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashOpaqueToken(token)).toBe(hashOpaqueToken(token));
  });
});

describe("JoseAccessTokenService", () => {
  const service = new JoseAccessTokenService(settings);

  it("emite e valida o token com as claims da sessão", async () => {
    const { token, expiresIn } = await service.issue(claims);

    expect(expiresIn).toBe(900);
    expect(await service.verify(token)).toEqual(claims);
  });

  it("recusa token assinado com outro segredo", async () => {
    const other = new JoseAccessTokenService({ ...settings, secret: "o".repeat(48) });
    const { token } = await other.issue(claims);

    await expect(service.verify(token)).rejects.toThrow("Token inválido ou expirado.");
  });

  it("recusa token de outro emissor ou outra audiência", async () => {
    const wrongIssuer = await new JoseAccessTokenService({ ...settings, issuer: "outro" }).issue(claims);
    const wrongAudience = await new JoseAccessTokenService({ ...settings, audience: "outro" }).issue(claims);

    await expect(service.verify(wrongIssuer.token)).rejects.toThrow();
    await expect(service.verify(wrongAudience.token)).rejects.toThrow();
  });

  it("recusa token expirado", async () => {
    const key = new TextEncoder().encode(settings.secret);
    const expired = await new SignJWT({ role: "EMPLOYEE", sid: claims.sessionId })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(claims.userId)
      .setIssuer(settings.issuer)
      .setAudience(settings.audience)
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .setJti("jti")
      .sign(key);

    await expect(service.verify(expired)).rejects.toThrow();
  });

  it("recusa token sem assinatura (alg none)", async () => {
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({ sub: claims.userId, sid: claims.sessionId, role: "ANALYST", iss: settings.issuer, aud: settings.audience }),
    ).toString("base64url");

    await expect(service.verify(`${header}.${payload}.`)).rejects.toThrow();
  });

  it("recusa token com papel desconhecido", async () => {
    const key = new TextEncoder().encode(settings.secret);
    const forged = await new SignJWT({ role: "ADMIN", sid: claims.sessionId })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(claims.userId)
      .setIssuer(settings.issuer)
      .setAudience(settings.audience)
      .setIssuedAt()
      .setExpirationTime("5m")
      .setJti("jti")
      .sign(key);

    await expect(service.verify(forged)).rejects.toThrow();
  });
});
