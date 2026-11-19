-- CreateTable
CREATE TABLE "ticketing"."idempotency_keys" (
    "key" VARCHAR(80) NOT NULL,
    "operation" VARCHAR(40) NOT NULL,
    "request_hash" CHAR(64) NOT NULL,
    "ticket_code" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "idempotency_keys_created_at_idx" ON "ticketing"."idempotency_keys"("created_at");
