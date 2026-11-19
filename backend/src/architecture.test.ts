import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SOURCE_ROOT = join(import.meta.dirname);
const IGNORED_DIRECTORIES = new Set(["generated"]);
const UNSAFE_RAW_SQL = /\$(queryRawUnsafe|executeRawUnsafe)\b|Prisma\.raw\(/;

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);

    if (statSync(path).isDirectory()) {
      return IGNORED_DIRECTORIES.has(entry) ? [] : sourceFiles(path);
    }

    return path.endsWith(".ts") && !path.endsWith("architecture.test.ts") ? [path] : [];
  });
}

describe("arquitetura", () => {
  it("não usa SQL bruto sem parâmetros em nenhum ponto do código", () => {
    const offenders = sourceFiles(SOURCE_ROOT)
      .filter((file) => UNSAFE_RAW_SQL.test(readFileSync(file, "utf8")))
      .map((file) => relative(SOURCE_ROOT, file));

    expect(offenders).toEqual([]);
  });

  it("só a camada de infraestrutura e os repositórios conhecem o Prisma", () => {
    const allowed = /(^infra[\\/]|prisma-[\w-]+\.ts$|container\.ts$)/;
    const offenders = sourceFiles(SOURCE_ROOT)
      .filter((file) => /generated\/prisma|@prisma\//.test(readFileSync(file, "utf8")))
      .map((file) => relative(SOURCE_ROOT, file))
      .filter((file) => !allowed.test(file));

    expect(offenders).toEqual([]);
  });
});
