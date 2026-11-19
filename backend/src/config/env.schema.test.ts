import { describe, expect, it } from "vitest";
import { parseEnv } from "./env.schema.js";

const valid = {
  DATABASE_URL: "postgresql://nexo:senha@localhost:5432/nexo_assist",
  JWT_ACCESS_SECRET: "a".repeat(32),
};

describe("parseEnv", () => {
  it("aceita a configuração mínima e aplica padrões seguros", () => {
    const result = parseEnv(valid);

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      ACCESS_TOKEN_TTL_SECONDS: 900,
      REFRESH_TOKEN_TTL_DAYS: 7,
      TRUST_PROXY: false,
      CORS_ORIGIN: ["http://localhost:3000"],
    });
  });

  it("recusa segredo de JWT curto", () => {
    expect(parseEnv({ ...valid, JWT_ACCESS_SECRET: "curto" }).success).toBe(false);
  });

  it("recusa banco que não seja PostgreSQL", () => {
    expect(parseEnv({ ...valid, DATABASE_URL: "mysql://root@localhost/db" }).success).toBe(false);
  });

  it("recusa access token com validade longa demais", () => {
    expect(parseEnv({ ...valid, ACCESS_TOKEN_TTL_SECONDS: "86400" }).success).toBe(false);
  });

  it("aceita várias origens de CORS e recusa origem inválida", () => {
    expect(parseEnv({ ...valid, CORS_ORIGIN: "http://localhost:3000, http://localhost:3001" }).data?.CORS_ORIGIN).toEqual([
      "http://localhost:3000",
      "http://localhost:3001",
    ]);
    expect(parseEnv({ ...valid, CORS_ORIGIN: "*" }).success).toBe(false);
  });
});
