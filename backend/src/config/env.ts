import "dotenv/config";
import { z } from "zod";
import { parseEnv } from "./env.schema.js";

const parsed = parseEnv(process.env);

if (!parsed.success) {
  console.error("Variáveis de ambiente inválidas:\n" + z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
