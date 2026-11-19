-- AlterTable
ALTER TABLE "app"."agent_decisions" ADD COLUMN     "cache_read_tokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cache_write_tokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cost_usd" DECIMAL(12,6) NOT NULL DEFAULT 0;
