# Job Dispatch Redesign: LISTEN/NOTIFY + Fallback Polling

## Scope

### In Scope
- Add PostgreSQL LISTEN/NOTIFY for low-latency job wakeups
- Keep outbox table as durable source of truth
- Add fallback polling + startup scan for reliability
- Enhance schema with lease-based claiming and proper retry fields
- Consumer idempotency guarantees

### Out of Scope
- External queue migration (SQS/Redis) - future work
- Multi-worker horizontal scaling - guidance only
- V2 semantic search jobs - separate slice

---

## Current State Summary

### Architecture
- **Producer**: `CreateItemUseCase` inserts item + outbox job in same transaction
- **Consumer**: `EnrichmentWorker._run_loop()` polls every 2 seconds
- **Claiming**: `claim_next_pending()` uses `FOR UPDATE SKIP LOCKED`
- **Retry**: `attempt_count` incremented on failure, max 3 retries

### Schema (enrichment_outbox)
```sql
id, item_id, status, attempt_count, claimed_at, last_error, created_at
```

### Gaps
| Gap | Impact |
|-----|--------|
| No LISTEN/NOTIFY | 2s latency between enqueue and pickup |
| No lease expiry | Crashed workers hold claims forever |
| No `retry_at` | No backoff between retries |
| No `locked_by` | Can't identify which worker holds claim |
| No `job_type` | Only enrichment jobs supported |

---

## Target Design Goals

1. **Low latency**: NOTIFY on enqueue → immediate wakeup
2. **Reliable**: Outbox is truth; NOTIFY is optimization only
3. **Crash-safe**: Lease expiry reclaims orphaned jobs
4. **Idempotent**: Item state transitions prevent duplicate effects
5. **Observable**: job_id, attempt_count, latency, error tracking
6. **Extensible**: Support multiple job types (enrichment, future: vectors)

---

## Implementation Plan

### Phase 0: Schema Enhancement (Migration)

Add columns to `enrichment_outbox`:
```sql
ALTER TABLE enrichment_outbox ADD COLUMN job_type VARCHAR(50) NOT NULL DEFAULT 'enrichment';
ALTER TABLE enrichment_outbox ADD COLUMN run_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE enrichment_outbox ADD COLUMN locked_by VARCHAR(100);
ALTER TABLE enrichment_outbox ADD COLUMN lease_expires_at TIMESTAMPTZ;
ALTER TABLE enrichment_outbox ADD COLUMN last_error_code VARCHAR(50);
-- Rename last_error to last_error_message for clarity (keep existing data)
ALTER TABLE enrichment_outbox RENAME COLUMN last_error TO last_error_message;
```

Update indexes:
```sql
-- Jobs ready to run (pending, not yet due, or lease expired)
CREATE INDEX idx_outbox_runnable ON enrichment_outbox(run_at, created_at)
    WHERE status = 'PENDING';

-- Expired leases for reclaim
CREATE INDEX idx_outbox_expired_lease ON enrichment_outbox(lease_expires_at)
    WHERE status = 'IN_PROGRESS' AND lease_expires_at IS NOT NULL;
```

### Phase 1: Producer Side (NOTIFY)

#### Changes to `OutboxRepository.create()`:
```python
async def create(self, item_id: str, job_type: str = "enrichment") -> OutboxJob:
    # 1. Insert outbox row (as before)
    job = ...
    await self.session.flush()  # Ensure row committed to transaction
    
    # 2. Queue NOTIFY for after-commit
    # Using asyncpg or psycopg3 connection.execute("NOTIFY litevault_jobs")
    await self._queue_notify()
    return job
```

#### NOTIFY payload strategy:
- Channel: `litevault_jobs`
- Payload: Empty or `{"job_type": "enrichment"}` (minimal)
- Treat as "poke" not data transport

#### After-commit hook:
```python
# Option A: SQLAlchemy event.listen(session, "after_commit", send_notify)
# Option B: Wrap in transaction context that sends NOTIFY on success
```

### Phase 2: Consumer Side (LISTEN + Drain)

#### Dedicated LISTEN Connection
```python
class JobListener:
    def __init__(self):
        self._listen_conn: asyncpg.Connection  # Dedicated connection
        self._drain_lock = asyncio.Lock()  # Prevent concurrent drains
    
    async def connect(self):
        self._listen_conn = await asyncpg.connect(DATABASE_URL)
        await self._listen_conn.add_listener("litevault_jobs", self._on_notify)
    
    async def _on_notify(self, conn, pid, channel, payload):
        # Trigger drain (debounced or immediate)
        asyncio.create_task(self._maybe_drain())
```

#### Drain Function
```python
async def drain(self, batch_size: int = 10) -> int:
    """Claim and process up to batch_size jobs."""
    async with self._drain_lock:
        processed = 0
        while processed < batch_size:
            job = await self._claim_next()
            if job is None:
                break
            await self._process_job(job)
            processed += 1
        return processed
```

#### Fallback Polling
```python
# Every 30 seconds (raised from 2s after NOTIFY is stable)
async def _poll_loop(self):
    while self.running:
        await asyncio.sleep(30)
        await self.drain()
```

#### Startup Scan
```python
async def start(self):
    await self.connect()
    # Drain existing pending jobs on startup
    await self.drain(batch_size=100)
    # Start LISTEN + poll loops
    ...
```

### Phase 3: Claiming with Lease

#### Claim Query
```sql
UPDATE enrichment_outbox
SET status = 'IN_PROGRESS',
    locked_by = :worker_id,
    locked_at = NOW(),
    lease_expires_at = NOW() + INTERVAL '5 minutes'
WHERE id = (
    SELECT id FROM enrichment_outbox
    WHERE status = 'PENDING'
      AND run_at <= NOW()
    ORDER BY created_at
    LIMIT 1
    FOR UPDATE SKIP LOCKED
)
RETURNING *;
```

#### Lease Renewal (Optional)
For long-running jobs, worker can renew lease:
```sql
UPDATE enrichment_outbox SET lease_expires_at = NOW() + INTERVAL '5 minutes'
WHERE id = :job_id AND locked_by = :worker_id;
```

#### Expired Lease Reclaim (Reaper)
```python
async def reclaim_expired_leases(self):
    """Reset expired leases to PENDING."""
    await session.execute("""
        UPDATE enrichment_outbox
        SET status = 'PENDING', locked_by = NULL, lease_expires_at = NULL
        WHERE status = 'IN_PROGRESS' AND lease_expires_at < NOW()
    """)
```

### Phase 4: Idempotency Guarantees

#### Job-Level Idempotency
- Job can only transition: `PENDING → IN_PROGRESS → DONE/FAILED`
- `FOR UPDATE SKIP LOCKED` prevents double-claim
- Status check before processing

#### Side-Effect Idempotency
```python
# In worker processing:
item = await item_repo.get_by_id_for_update_system(job.item_id)
if item.status != ItemStatus.ENRICHING:
    # Already processed or discarded, skip
    await outbox_repo.mark_completed(job.id)
    return
```

#### Idempotency Key Correlation
- `item.id` is the idempotency key for enrichment
- If enrichment runs twice, second run sees item already READY_TO_CONFIRM → no-op

### Phase 5: Failure & Retry Policy

| Attempt | Backoff | run_at |
|---------|---------|--------|
| 1 | 0s | NOW() |
| 2 | 30s | NOW() + 30s |
| 3 | 5min | NOW() + 5min |
| 4+ | Mark FAILED | - |

```python
async def mark_failed(self, job_id: str, error_code: str, error_message: str):
    job = await self.get(job_id)
    if job.attempt_count >= MAX_RETRIES:
        await self._mark_dead(job_id)
    else:
        backoff = self._calculate_backoff(job.attempt_count)
        await session.execute("""
            UPDATE enrichment_outbox
            SET status = 'PENDING',
                attempt_count = attempt_count + 1,
                run_at = NOW() + :backoff,
                last_error_code = :error_code,
                last_error_message = :error_message,
                locked_by = NULL,
                lease_expires_at = NULL
            WHERE id = :job_id
        """)
```

### Phase 6: Observability

| Metric | Type | Labels |
|--------|------|--------|
| `job_queue_depth` | Gauge | job_type |
| `job_claimed_total` | Counter | job_type, worker_id |
| `job_completed_total` | Counter | job_type, status (success/failed/dead) |
| `job_processing_seconds` | Histogram | job_type |
| `job_notification_received_total` | Counter | channel |
| `job_poll_scanned_total` | Counter | - |

Structured logs:
```json
{"event": "job_claimed", "job_id": "...", "item_id": "...", "attempt": 1, "worker_id": "..."}
{"event": "job_completed", "job_id": "...", "item_id": "...", "duration_ms": 1234}
{"event": "job_failed", "job_id": "...", "error_code": "...", "will_retry": true}
```

---

## Rollout Plan

| Phase | Action | Rollback |
|-------|--------|----------|
| 0 | Apply schema migration | Reverse migration |
| 1 | Deploy with NOTIFY disabled (env flag) | Env toggle |
| 2 | Enable NOTIFY, keep 2s polling | Disable NOTIFY |
| 3 | Raise polling to 30s | Lower polling |
| 4 | Monitor for 1 week | - |
| 5 | Declare stable | - |

---

## Verification Strategy

### Unit Tests
- NOTIFY payload format
- Backoff calculation
- Lease expiry logic

### Integration Tests
1. **Happy path**: Enqueue → NOTIFY → drain → completed
2. **Missed NOTIFY**: Enqueue (no NOTIFY) → poll picks up
3. **Concurrent workers**: Two workers claim → SKIP LOCKED → no duplicate
4. **Crash recovery**: Claim → crash (disconnect) → lease expires → reclaim
5. **Idempotency**: Process twice → item unchanged after first

### Manual/E2E
- Deploy to staging
- Create 100 items rapidly
- Verify all enriched within 5 seconds (vs 200s with polling)
- Kill worker mid-processing → verify reclaim after lease expiry

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| NOTIFY lost during network issue | Fallback poll every 30s |
| LISTEN connection drops | Reconnect with exponential backoff |
| Long-running job exceeds lease | Lease renewal or longer lease |
| pgbouncer incompatible with LISTEN | Use direct connection for listener |

---

## Open Questions

1. **pgbouncer**: Are we using pgbouncer? If so, LISTEN needs direct connection.
2. **Lease duration**: 5 minutes default - is enrichment ever longer?
3. **Dead letter handling**: Should we add a separate `dead_jobs` table or just status='DEAD'?
4. **Multi-job-type**: Rename table to `job_outbox` or keep `enrichment_outbox`?

---

## Progress Checklist

### Design Phase (Complete)
- [x] Analyze current implementation
- [x] Define target architecture
- [x] Write implementation plan
- [x] Update `data_model_v1.md` with schema changes
- [x] Update `backend_architecture_v1.md` with dispatcher section
- [x] Update `use_cases_v1.md` with job flow
- [x] Human approval

### Implementation Phase (After Approval)
- [ ] Create migration for schema changes
- [ ] Implement NOTIFY on producer
- [ ] Implement LISTEN connection
- [ ] Implement drain function
- [ ] Add fallback polling
- [ ] Add lease expiry reclaim
- [ ] Add observability
- [ ] Integration tests
- [ ] Rollout

---

*Created: 2025-12-29*
*Status: Design Review*
