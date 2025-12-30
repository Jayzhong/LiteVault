# AI Rate Limiting & Quota System

> Design for managing AI feature usage, controlling costs, and preventing abuse in LiteVault.

## 1. Goals

1.  **Cost Control**: Limit the total number of AI calls (LLM tokens) per user to stay within budget.
2.  **Abuse Prevention**: Prevent malicious users from spamming enrichment endpoints or exhausting worker queues.
3.  **Fairness**: Ensure heavy users don't degrade performance for others by monopolizing worker threads.
4.  **UX Predictability**: Provide clear feedback to users when limits are reached (429 errors, UI warnings).
5.  **Idempotency**: Ensure retries of the same enrichment job do not double-charge the user.

## 2. Limits & Quotas (MVP)

We will enforce limits at three levels. Limits vary by user plan (Free vs Pro).

| Limit Type | Scope | Metric | Free Tier | Pro Tier | Error Code |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Burst Limit** | API Request | Requests / Minute | 10 / min | 60 / min | `RATE_LIMITED` |
| **Daily Quota** | AI Feature | Enrichments / Day | 50 / day | 500 / day | `DAILY_QUOTA_EXCEEDED` |
| **Concurrency** | Async Job | Active Jobs | 3 concurrent | 10 concurrent | `CONCURRENCY_LIMIT_EXCEEDED` |

### Definitions
-   **Burst Limit**: Standard API rate limiting to protect the web server. Applies to `POST /items` (triggering enrichment).
-   **Daily Quota**: The total number of "Enrichment" actions a user can perform in a 24-hour window (UTC day).
-   **Concurrency**: The number of items in `ENRICHING` status simultaneously. This protects the worker queue depth.

## 3. Architecture & Data Model

We will use a **Postgres-first approach** for MVP, leveraging transactional integrity to ensure correct tracking without needing Redis.

### 3.1 `ai_daily_usage` (New Table)
Tracks usage counters per user per day. Optimized for fast reads/increments.

| Column | Type | Description |
| :--- | :--- | :--- |
| `user_id` | UUID | User reference (PK, FK) |
| `day_date` | DATE | UTC Date (PK) (e.g., '2025-12-30') |
| `enrichment_count` | INT | Number of enrichments used today |
| `updated_at` | TIMESTAMPTZ | Last update time |
| `limit_override` | INT | Optional override for this specific user/day |

**Constraints**:
-   Primary Key: `(user_id, day_date)`

### 3.2 `ai_usage_ledger` (New Table)
Immutable audit log of every chargeable event. Used for debugging, auditing, and usage analysis.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Unique Event ID (PK) |
| `user_id` | UUID | User reference (FK) |
| `action` | VARCHAR | 'ENRICH_ITEM' |
| `resource_id` | UUID | Item ID being enriched |
| `cost_units` | INT | 1 (future-proof for token counts) |
| `created_at` | TIMESTAMPTZ | When the charge occurred |

**Indices**:
-   `idx_ledger_user_date`: `(user_id, created_at)`
-   `idx_ledger_dedup`: `(user_id, resource_id, action)` (For idempotency)

---

## 4. Enforcement Strategy

Enforcement happens at the **API Layer** (Request Entry), inside the transaction that creates the item.

### 4.1 "Check & Charge" Transaction
When `POST /items` is called with `enrich=true`:

```sql
BEGIN;

-- 1. Check Concurrency
-- Count items currently in ENRICHING state for this user
SELECT COUNT(*) FROM items 
WHERE user_id = :uid AND status = 'ENRICHING';
-- IF count >= CONCURRENCY_LIMIT -> ROLLBACK & 429

-- 2. Check & Increment Daily Quota (Atomic Upsert)
INSERT INTO ai_daily_usage (user_id, day_date, enrichment_count)
VALUES (:uid, CURRENT_DATE, 1)
ON CONFLICT (user_id, day_date)
DO UPDATE SET enrichment_count = ai_daily_usage.enrichment_count + 1
RETURNING enrichment_count;
-- IF enrichment_count > DAILY_QUOTA -> ROLLBACK & 429

-- 3. Record Ledger Entry (Idempotency)
-- Ensures we don't charge for the same item_id twice (e.g. if client retries POST)
INSERT INTO ai_usage_ledger (user_id, action, resource_id, created_at)
VALUES (:uid, 'ENRICH_ITEM', :new_item_id, NOW());

-- 4. Create Item & Outbox Job
INSERT INTO items ...;
INSERT INTO enrichment_outbox ...;

COMMIT;
```

### 4.2 Idempotency & Retries

-   **API Retries**: If the client sends the same request (same `idempotency_key`), the backend returns the *existing* item. No new charge.
-   **Job Retries**: If the worker fails processing (`FAILED` -> `ENRICHING` retry), we do **NOT** increment the quota again. The `ai_usage_ledger` already exists for this `item_id`. The check logic in `4.1` is for *new* items.
-   **Manual Retry**: If user manually clicks "Retry" (`POST /items/:id/retry`), we generally do **NOT** charge for retries of failed jobs (good UX). We limit this by capping `retry_count` on the job itself (stored in `enrichment_outbox`), not by billing quota.

## 5. Security & Observability

### 5.1 Security
-   **Scope**: All limits are scoped to `user_id`.
-   **Bypass**: Internal system actions or admin overrides can bypass limits by flagging the context.
-   **Plan Validation**: User plan (`free` vs `pro`) is checked from the `users` table to determine which limit constants to apply.

### 5.2 Observability Headers
Return standard RateLimit headers on 429 responses, and optionally on successful responses (so client knows usage).

**Headers**:
-   `X-AI-Quota-Limit`: 50
-   `X-AI-Quota-Remaining`: 49
-   `X-AI-Quota-Reset`: seconds until UTC midnight

### 5.3 Monitoring
-   **Log**: "Quota exceeded for user X" (WARN level).
-   **Metric**: `ai_quota.exceeded_count` (counter).
-   **Metric**: `ai.enrichment_requests` (counter).

## 6. Edge Cases

1.  **Transaction Race Condition**: Two concurrent requests might both read `count=49` and pass.
    -   *Mitigation*: The atomic `UPDATE ... RETURNING` in Postgres handles the daily quota correctly. Concurrency race is possible but acceptable (phantom read). Strict `SELECT FOR UPDATE` on user row is possible but may cause contention. For MVP, slight concurrency overage is fine.
2.  **Job Failure Refund**: If the job dies immediately after commit?
    -   *Decision*: We do **not** auto-refund. Failures consume resources. "Retry" fixes it without new charge.
3.  **Clock Skew**: `CURRENT_DATE` implies DB server time (UTC). Consistent.

