import { argon2id, hash, needsRehash, verify } from "argon2";
import type { PasswordHasher } from "../../modules/auth/auth.ports.js";

const options = {
  type: argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export class Argon2PasswordHasher implements PasswordHasher {
  hash(plain: string): Promise<string> {
    return hash(plain, options);
  }

  async verify(passwordHash: string, plain: string): Promise<boolean> {
    try {
      return await verify(passwordHash, plain);
    } catch {
      return false;
    }
  }

  needsRehash(passwordHash: string): boolean {
    return needsRehash(passwordHash, options);
  }
}
