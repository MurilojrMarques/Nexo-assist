import { z } from "zod";
import { pricedModels } from "../domain/cost/model-pricing.js";

const commaSeparatedUrls = z
  .string()
  .transform((value) => value.split(",").map((item) => item.trim()).filter(Boolean))
  .pipe(z.array(z.url()).min(1));

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3333),
  CORS_ORIGIN: commaSeparatedUrls.default(["http://localhost:3000"]),
  TRUST_PROXY: z.stringbool().default(false),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET precisa de pelo menos 32 caracteres."),
  JWT_ISSUER: z.string().min(1).default("nexo-assist-api"),
  JWT_AUDIENCE: z.string().min(1).default("nexo-assist-web"),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  SESSION_MAX_AGE_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().min(3).max(20).default(5),
  LOGIN_LOCKOUT_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),
  REFRESH_REUSE_GRACE_SECONDS: z.coerce.number().int().min(0).max(30).default(10),
  TICKETING_SERVICE_URL: z.url({ protocol: /^https?$/ }),
  TICKETING_SERVICE_TOKEN: z.string().min(32, "TICKETING_SERVICE_TOKEN precisa de pelo menos 32 caracteres."),
  TICKETING_TIMEOUT_MS: z.coerce.number().int().min(200).max(10000).default(2000),
  TICKETING_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(6).default(4),
  TICKETING_RETRY_BASE_MS: z.coerce.number().int().min(50).max(5000).default(400),
  ANTHROPIC_API_KEY: z
    .string()
    .trim()
    .transform((value) => value || undefined)
    .optional(),
  AGENT_MODEL: z.enum(pricedModels).default("claude-sonnet-5-5"),
  TRIAGE_MODEL: z.enum(pricedModels).default("claude-haiku-5-5"),
  AGENT_MAX_STEPS: z.coerce.number().int().min(1).max(10).default(5),
  AGENT_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(256).max(4096).default(600),
  AGENT_HISTORY_WINDOW: z.coerce.number().int().min(2).max(30).default(12),
  MESSAGES_PER_MINUTE: z.coerce.number().int().min(1).max(120).default(12),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>) {
  return envSchema.safeParse(source);
}
