import { randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import type { AccessTokenClaims, AccessTokenService } from "../../modules/auth/auth.ports.js";
import { roles } from "../../modules/auth/auth.types.js";
import { UnauthorizedError } from "../../shared/errors/http-errors.js";

export type AccessTokenSettings = {
  secret: string;
  issuer: string;
  audience: string;
  ttlSeconds: number;
};

const ALGORITHM = "HS256";

const claimsSchema = z.object({
  sub: z.uuid(),
  sid: z.uuid(),
  role: z.enum(roles),
});

export class JoseAccessTokenService implements AccessTokenService {
  private readonly key: Uint8Array;

  constructor(private readonly settings: AccessTokenSettings) {
    this.key = new TextEncoder().encode(settings.secret);
  }

  async issue(claims: AccessTokenClaims): Promise<{ token: string; expiresIn: number }> {
    const token = await new SignJWT({ role: claims.role, sid: claims.sessionId })
      .setProtectedHeader({ alg: ALGORITHM, typ: "JWT" })
      .setSubject(claims.userId)
      .setIssuer(this.settings.issuer)
      .setAudience(this.settings.audience)
      .setIssuedAt()
      .setExpirationTime(`${this.settings.ttlSeconds}s`)
      .setJti(randomUUID())
      .sign(this.key);

    return { token, expiresIn: this.settings.ttlSeconds };
  }

  async verify(token: string): Promise<AccessTokenClaims> {
    try {
      const { payload } = await jwtVerify(token, this.key, {
        algorithms: [ALGORITHM],
        issuer: this.settings.issuer,
        audience: this.settings.audience,
        requiredClaims: ["sub", "sid", "exp", "iat", "jti"],
      });
      const claims = claimsSchema.parse(payload);

      return { userId: claims.sub, role: claims.role, sessionId: claims.sid };
    } catch {
      throw new UnauthorizedError("Token inválido ou expirado.");
    }
  }
}
