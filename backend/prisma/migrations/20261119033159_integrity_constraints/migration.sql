ALTER TABLE "app"."users"
  ADD CONSTRAINT "users_email_lowercase" CHECK ("email" = lower("email")),
  ADD CONSTRAINT "users_failed_login_attempts_non_negative" CHECK ("failed_login_attempts" >= 0),
  ADD CONSTRAINT "users_analyst_has_team" CHECK ("role" <> 'ANALYST' OR "team" IS NOT NULL);

ALTER TABLE "app"."refresh_tokens"
  ADD CONSTRAINT "refresh_tokens_hash_is_sha256" CHECK ("token_hash" ~ '^[0-9a-f]{64}$');

ALTER TABLE "app"."conversations"
  ADD CONSTRAINT "conversations_message_count_non_negative" CHECK ("message_count" >= 0),
  ADD CONSTRAINT "conversations_analyst_when_attending" CHECK ("status" <> 'WITH_ANALYST' OR "assigned_analyst_id" IS NOT NULL);

ALTER TABLE "app"."agent_decisions"
  ADD CONSTRAINT "agent_decisions_confidence_range" CHECK ("confidence" >= 0 AND "confidence" <= 1),
  ADD CONSTRAINT "agent_decisions_usage_non_negative" CHECK ("input_tokens" >= 0 AND "output_tokens" >= 0 AND "latency_ms" >= 0);

ALTER TABLE "ticketing"."tickets"
  ADD CONSTRAINT "tickets_code_format" CHECK ("code" ~ '^(INC|REQ)-[0-9]{5,}$'),
  ADD CONSTRAINT "tickets_code_matches_type" CHECK (
    ("type" = 'INCIDENT' AND "code" LIKE 'INC-%') OR ("type" = 'REQUEST' AND "code" LIKE 'REQ-%')
  );

ALTER TABLE "ticketing"."ticket_sequences"
  ADD CONSTRAINT "ticket_sequences_last_number_non_negative" CHECK ("last_number" >= 0);
