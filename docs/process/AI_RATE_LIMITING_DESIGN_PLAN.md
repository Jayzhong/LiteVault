# AI Rate Limiting Implementation Plan

> Detailed plan for implementing the robust AI rate limiting and quota system for LiteVault.

## 0. Prerequisite Check
- [ ] Review `docs/architecture/ai_rate_limiting.md`
- [ ] Review `docs/architecture/API_CONTRACT_V1.md`

## 1. Slice 1: Database Schema
Add tracking tables for usage quotas.
- [ ] Create Alembic migration `add_ai_usage_tables`.
    - [ ] Table `ai_daily_usage` (user_id, day_date, enrichment_count, ...).
    - [ ] Table `ai_usage_ledger` (id, user_id, action, resource_id, ...).
    - [ ] Indexes for per-user lookup and idempotency.
- [ ] Create SQLAlchemy models:
    - [ ] `backend/app/infrastructure/persistence/models/ai_usage_model.py`

## 2. Slice 2: Repository & Domain Logic
Implement tracking and verification logic.
- [ ] **Domain**:
    - [ ] Create `AIUsageRepository` interface.
    - [ ] Create `QuotaPolicy` service (decides limits based on user plan).
- [ ] **Infrasturcture**:
    - [ ] Implement `SQLAlchemyAIUsageRepository`.
        - Methods: `increment_daily_usage`, `record_ledger_entry`, `get_daily_usage`.
    - [ ] Use atomic `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` for counters.

## 3. Slice 3: API Enforcement (Backend)
Enforce limits at the entry point of enrichment.
- [ ] Modify `backend/app/application/items/create_item.py` (CreateItemUseCase).
    - [ ] Inject `AIUsageRepository`.
    - [ ] Add `check_and_charge_quota(user_id, item_id)` step inside the transaction.
    - [ ] Logic:
        1. Check "Concurrency" (count ENRICHING items).
        2. Attempt "Daily Quota" charge (atomic increment).
        3. Record ledger (idempotency check).
    - [ ] Throw `QuotaExceededException` or `ConcurrencyLimitExceededException` if checks fail.
- [ ] map exceptions to 429/Error Codes in `exception_handlers.py`.

## 4. Slice 4: Observability & Headers
- [ ] Middleware or Interceptor to inject `X-AI-Quota-*` headers on responses.
    - Alternatively, return quota info in `CreateItemOutput` and set headers in Router.
- [ ] Add logging for quota breaches.

## 5. Slice 5: Frontend Experience
Handle the new error codes gracefully.
- [ ] Update `lib/api/client.ts` or error interceptor.
    - Handle `DAILY_QUOTA_EXCEEDED` -> Show Toast / Modal "You've reached your daily limit."
    - Handle `CONCURRENCY_LIMIT_EXCEEDED` -> Show Toast "Too many items processing."
- [ ] (Optional) Add "Usage Indicator" in UI (e.g. "49/50" in settings or sidebar).

## 6. Testing Plan
- [ ] **Backend Integration Tests**:
    - [ ] `test_rate_limiting.py`:
        - Mock user on Free plan.
        - Loop 50 times -> Success.
        - 51st time -> 429 DAILY_QUOTA_EXCEEDED.
    - [ ] `test_concurrency_limit.py`:
        - Create 3 items (mock async worker not picking them up).
        - 4th item -> 429 CONCURRENCY_LIMIT_EXCEEDED.
    - [ ] `test_idempotency_billing.py`:
        - Send same request key twice. Verify quota only incremented once.
- [ ] **Manual Verification**:
    - [ ] Set low limit (e.g. 2) in local dev.
    - [ ] Create 3 items. Verify 3rd fails with nice UI message.

## Risks & Mitigations
- **Performance**: High concurrency counting `items` table?
    - *Mitigation*: Partial index on `status='ENRICHING'` for fast counts.
- **Race Conditions**: Parallel requests over-counting?
    - *Mitigation*: Atomic DB increment handles this. Concurrency count is "read uncommitted" effectively but acceptable for MVP.
