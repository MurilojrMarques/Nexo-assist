-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "app";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "ticketing";

-- CreateEnum
CREATE TYPE "app"."Role" AS ENUM ('EMPLOYEE', 'ANALYST');

-- CreateEnum
CREATE TYPE "app"."SessionRevocationReason" AS ENUM ('LOGOUT', 'REFRESH_TOKEN_REUSE', 'PASSWORD_CHANGED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "app"."AuditAction" AS ENUM ('LOGIN_SUCCEEDED', 'LOGIN_FAILED', 'ACCOUNT_LOCKED', 'TOKEN_REFRESHED', 'REFRESH_TOKEN_REUSED', 'LOGOUT');

-- CreateEnum
CREATE TYPE "app"."ConversationStatus" AS ENUM ('WITH_AGENT', 'WAITING_ANALYST', 'WITH_ANALYST', 'CLOSED');

-- CreateEnum
CREATE TYPE "app"."MessageAuthor" AS ENUM ('EMPLOYEE', 'AGENT', 'ANALYST');

-- CreateEnum
CREATE TYPE "app"."ConversationEventType" AS ENUM ('TRANSFERRED', 'ASSUMED', 'RETURNED_TO_AGENT', 'CLOSED');

-- CreateEnum
CREATE TYPE "app"."HandoffReason" AS ENUM ('EMPLOYEE_REQUEST', 'CRITICAL_ISSUE', 'OVERDUE_TICKET', 'LOW_CONFIDENCE');

-- CreateEnum
CREATE TYPE "app"."DraftAction" AS ENUM ('CREATE', 'UPDATE');

-- CreateEnum
CREATE TYPE "app"."DraftStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ticketing"."TicketType" AS ENUM ('INCIDENT', 'REQUEST');

-- CreateEnum
CREATE TYPE "ticketing"."TicketCategory" AS ENUM ('ACCESS', 'NETWORK_VPN', 'HARDWARE', 'SOFTWARE', 'EMAIL', 'OTHER');

-- CreateEnum
CREATE TYPE "ticketing"."TicketPriority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "ticketing"."TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_ANALYST', 'APPROVED', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ticketing"."AffectedScope" AS ENUM ('ONLY_ME', 'TEAM', 'COMPANY', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ticketing"."TicketUpdateKind" AS ENUM ('CREATED', 'COMMENT', 'STATUS_CHANGED', 'PRIORITY_CHANGED', 'REOPENED', 'TRANSFERRED');

-- CreateTable
CREATE TABLE "app"."users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "department" VARCHAR(80) NOT NULL,
    "role" "app"."Role" NOT NULL DEFAULT 'EMPLOYEE',
    "team" VARCHAR(80),
    "password_hash" TEXT NOT NULL,
    "password_changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "revoked_reason" "app"."SessionRevocationReason",
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(255),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."refresh_tokens" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" "app"."AuditAction" NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(255),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."knowledge_articles" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "content" TEXT NOT NULL,
    "category" "ticketing"."TicketCategory",
    "tags" TEXT[],
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "knowledge_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."conversations" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "status" "app"."ConversationStatus" NOT NULL DEFAULT 'WITH_AGENT',
    "assigned_analyst_id" UUID,
    "focus_ticket_code" VARCHAR(20),
    "handoff_reason" "app"."HandoffReason",
    "handoff_summary" TEXT,
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "last_message_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "author" "app"."MessageAuthor" NOT NULL,
    "author_id" UUID,
    "content" TEXT NOT NULL,
    "parts" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."conversation_events" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "type" "app"."ConversationEventType" NOT NULL,
    "actor_id" UUID,
    "reason" "app"."HandoffReason",
    "team" VARCHAR(80),
    "summary" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."ticket_drafts" (
    "id" UUID NOT NULL,
    "number" SERIAL NOT NULL,
    "conversation_id" UUID NOT NULL,
    "action" "app"."DraftAction" NOT NULL,
    "status" "app"."DraftStatus" NOT NULL DEFAULT 'PENDING',
    "target_ticket_code" VARCHAR(20),
    "result_ticket_code" VARCHAR(20),
    "type" "ticketing"."TicketType" NOT NULL,
    "category" "ticketing"."TicketCategory" NOT NULL,
    "priority" "ticketing"."TicketPriority" NOT NULL,
    "affected_scope" "ticketing"."AffectedScope" NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "decided_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ticket_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."agent_decisions" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "intent" VARCHAR(60) NOT NULL,
    "understanding" TEXT NOT NULL,
    "action" VARCHAR(60) NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "rationale" TEXT NOT NULL,
    "steps" JSONB NOT NULL,
    "model" VARCHAR(80) NOT NULL,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "latency_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticketing"."tickets" (
    "id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "type" "ticketing"."TicketType" NOT NULL,
    "category" "ticketing"."TicketCategory" NOT NULL,
    "priority" "ticketing"."TicketPriority" NOT NULL,
    "status" "ticketing"."TicketStatus" NOT NULL DEFAULT 'OPEN',
    "affected_scope" "ticketing"."AffectedScope" NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" TEXT NOT NULL,
    "requester_id" UUID NOT NULL,
    "assignee_id" UUID,
    "due_at" TIMESTAMPTZ(3),
    "last_activity_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(3),
    "closed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticketing"."ticket_updates" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "author_id" UUID,
    "kind" "ticketing"."TicketUpdateKind" NOT NULL,
    "content" TEXT,
    "from_status" "ticketing"."TicketStatus",
    "to_status" "ticketing"."TicketStatus",
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticketing"."ticket_sequences" (
    "type" "ticketing"."TicketType" NOT NULL,
    "last_number" INTEGER NOT NULL,

    CONSTRAINT "ticket_sequences_pkey" PRIMARY KEY ("type")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "app"."users"("email");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "app"."sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "app"."refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_session_id_idx" ON "app"."refresh_tokens"("session_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "app"."audit_logs"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "app"."audit_logs"("action", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_articles_slug_key" ON "app"."knowledge_articles"("slug");

-- CreateIndex
CREATE INDEX "conversations_employee_id_last_message_at_idx" ON "app"."conversations"("employee_id", "last_message_at");

-- CreateIndex
CREATE INDEX "conversations_status_last_message_at_idx" ON "app"."conversations"("status", "last_message_at");

-- CreateIndex
CREATE INDEX "conversations_assigned_analyst_id_status_idx" ON "app"."conversations"("assigned_analyst_id", "status");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "app"."messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "conversation_events_conversation_id_created_at_idx" ON "app"."conversation_events"("conversation_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_drafts_number_key" ON "app"."ticket_drafts"("number");

-- CreateIndex
CREATE INDEX "ticket_drafts_conversation_id_status_idx" ON "app"."ticket_drafts"("conversation_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "agent_decisions_message_id_key" ON "app"."agent_decisions"("message_id");

-- CreateIndex
CREATE INDEX "agent_decisions_conversation_id_created_at_idx" ON "app"."agent_decisions"("conversation_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_code_key" ON "ticketing"."tickets"("code");

-- CreateIndex
CREATE INDEX "tickets_requester_id_status_idx" ON "ticketing"."tickets"("requester_id", "status");

-- CreateIndex
CREATE INDEX "tickets_status_due_at_idx" ON "ticketing"."tickets"("status", "due_at");

-- CreateIndex
CREATE INDEX "ticket_updates_ticket_id_created_at_idx" ON "ticketing"."ticket_updates"("ticket_id", "created_at");

-- AddForeignKey
ALTER TABLE "app"."sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "app"."sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "app"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."conversations" ADD CONSTRAINT "conversations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "app"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."conversations" ADD CONSTRAINT "conversations_assigned_analyst_id_fkey" FOREIGN KEY ("assigned_analyst_id") REFERENCES "app"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "app"."conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."messages" ADD CONSTRAINT "messages_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "app"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."conversation_events" ADD CONSTRAINT "conversation_events_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "app"."conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."conversation_events" ADD CONSTRAINT "conversation_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "app"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."ticket_drafts" ADD CONSTRAINT "ticket_drafts_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "app"."conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."agent_decisions" ADD CONSTRAINT "agent_decisions_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "app"."conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."agent_decisions" ADD CONSTRAINT "agent_decisions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "app"."messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticketing"."tickets" ADD CONSTRAINT "tickets_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "app"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticketing"."tickets" ADD CONSTRAINT "tickets_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "app"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticketing"."ticket_updates" ADD CONSTRAINT "ticket_updates_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "ticketing"."tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticketing"."ticket_updates" ADD CONSTRAINT "ticket_updates_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "app"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
