# TreasuryPilot Technical Architecture

## 1. Architecture Decision Summary

TreasuryPilot should be built as a single TypeScript web application with a server-side wallet execution layer. The frontend provides the treasury dashboard and request console. The backend handles agent reasoning, deterministic policy checks, and direct WDK wallet operations. The architecture also leaves room for two controlled extensions: natural-language bridge routing and agent-submitted requests.

This architecture is the best fit for the hackathon because it:

- keeps the system simple enough to finish,
- uses WDK primitives directly on a Node runtime,
- preserves a clean separation between reasoning, policy, and execution,
- leaves extension points for bridge routing and inbound agent requests without turning the product into a marketplace,
- supports both local demo mode and a self-hosted deployment model.

## 2. Recommended Stack

### Application

- Next.js 16 with App Router
- TypeScript
- React 19 for dashboard UI
- Tailwind CSS for fast interface development

### Server Runtime

- Node.js 20+ runtime
- Next.js route handlers or server actions for backend endpoints
- any route or server action that touches WDK should explicitly run on the `nodejs` runtime, not edge

### Wallet Layer

- `@tetherto/wdk`
- `@tetherto/wdk-wallet-evm-erc-4337`
- direct WDK primitives for wallet creation, account management, and transaction execution

### Optional Bridge Layer

- one WDK bridge module, only if the chosen demo route is verified as supported
- keep bridge support behind a narrow service boundary so it behaves like another treasury action, not a separate product

### Data Layer

- Prisma ORM
- SQLite for hackathon MVP

### Agent Layer

- current branch: deterministic parser/runtime implemented server-side
- optional future LLM provider behind a small adapter interface
- deterministic policy engine outside the LLM

### Optional Agent Channel Adapter

- OpenClaw can be added as a thin input channel if you want stronger alignment with the hackathon track wording
- if used, OpenClaw should forward normalized requests into the same backend services
- OpenClaw should not own policy enforcement or wallet execution

### Validation and Types

- Zod for runtime validation

### Logging and Observability

- structured server logs
- app-level audit events persisted in the database

## 2A. Current Branch Status

The current implementation has moved beyond scaffold in a few important areas and remains intentionally incomplete in others:

- Live on current branch:
  - Prisma-backed persistence for payment requests, approvals, transactions, audit events, bridge request records, agent clients, wallet config, vendors, and treasury policy
  - runtime normalization of relative SQLite URLs to absolute paths so Prisma works reliably in Next/Turbopack dev and build contexts
  - WDK wallet creation/import
  - encrypted seed storage
  - live wallet balance reads
  - live WDK transfer submission behind `WDK_EXECUTION_ENABLED`
  - on-demand receipt refresh through WDK read methods
  - API-backed payment console
  - API-backed dashboard
  - API-backed approval queue
  - API-backed audit page
  - API-backed policy read-only page
  - API-backed bridge console with supported-route and live-route visibility
  - natural-language bridge parsing, policy evaluation, persistence, and audit visibility
  - destination support for `Arbitrum -> Solana` requests in demo-safe mode

- Feature-flagged or scaffolded:
  - agent gateway request lane
  - bridge execution path behind `WDK_BRIDGE_EXECUTION_ENABLED`

- Important implementation boundary:
  - receipt reconciliation is currently user-driven and on-demand via `GET /api/payments?refresh=true` and `GET /api/payments/:id?refresh=true`
  - there is no background worker or cron-based reconciliation yet

## 3. Deployment Model

### MVP Deployment

Use a single Node deployment for both frontend and backend. This keeps WDK integration on the server where the runtime is predictable and secrets can be handled safely.

### Recommended Demo Setup

- run as one app on a local machine or a single VPS,
- use one demo wallet funded with test assets,
- configure one treasury admin session for judging.

### Custody Model

For the hackathon MVP, the wallet seed or signing material should be stored encrypted in app storage and only decrypted in memory for execution. This is acceptable for a self-hosted or demo deployment.

Production note:
- if this becomes a real product, key management needs a stronger design than a hackathon demo.

## 4. Core Architectural Principle

The system has three separate decision layers:

1. Agent reasoning
- interprets natural language requests into structured intents
- proposes action and rationale

2. Policy enforcement
- applies deterministic treasury rules
- returns `execute`, `escalate`, or `reject`

3. Wallet execution
- performs WDK operations only after policy approval
- never lets the LLM directly send transactions

This separation is the main safety boundary in the product.

Additional rule:

- external agents may submit requests, but they cannot bypass the policy engine or invoke wallet and bridge operations directly

## 5. System Components

### Frontend

Responsibilities:

- display wallet balance and treasury status
- create and edit policy rules
- submit payment requests
- show pending approvals
- show audit history and transaction results

Key screens:

- dashboard
- policy settings
- payment console
- approval queue
- audit log

Current branch note:
- `dashboard`, `payment console`, `approval queue`, `audit log`, and the policy overview are wired to live data.
- the policy page is currently read-only and does not yet support editing persisted thresholds from the UI.

### API Layer

Responsibilities:

- expose endpoints for wallet setup, policy management, payment requests, approvals, and audit retrieval
- optionally expose a constrained agent-facing submission endpoint and a bridge request endpoint
- validate all incoming payloads
- translate UI actions into domain commands

### Agent Service

Responsibilities:

- parse user request into a structured payment intent
- classify request category
- produce a human-readable explanation
- flag ambiguity or missing fields

The agent service must not call WDK directly.

Current branch note:
- The current parser is deterministic and heuristic.
- The architecture still allows a future LLM adapter, but no LLM dependency is required for the shipped MVP flow.

### Agent Gateway Service

Responsibilities:

- authenticate or identify external agent clients
- normalize external agent requests into the same internal request format used by human users
- attach request source metadata for auditing

The agent gateway service must not bypass policy or execution boundaries.

### Policy Engine

Responsibilities:

- enforce hard rules
- calculate whether a request is auto-approvable
- reject disallowed requests
- send borderline requests to approval

The policy engine is deterministic and testable without an LLM.

### Wallet Service

Responsibilities:

- initialize WDK client
- create or import wallet
- fetch address and balances
- prepare transfer transaction
- submit signed transaction
- return tx hash and execution status

This service is the only part of the app allowed to touch WDK primitives.

Current branch note:
- Live transfer execution is gated by `WDK_EXECUTION_ENABLED` and defaults to off in `.env.example`.
- Receipt refresh is implemented through a separate refresh service that uses WDK read methods and updates persisted transaction state.

### Bridge Service

Responsibilities:

- prepare bridge operations for one supported route
- validate source and destination chain metadata before execution
- call the selected WDK bridge module when the request passes policy
- record bridge lifecycle events for audit

This service should remain behind a narrow boundary so bridge routing behaves like another treasury action rather than a separate product.

Current branch note:
- The codebase now parses, stores, evaluates, and displays bridge requests through a live UI and can prepare a live execution path, but the current Sepolia-oriented demo runtime keeps bridge execution disabled unless a real Arbitrum bridge runtime and bridge config are supplied.

### Approval Service

Responsibilities:

- persist escalated requests
- allow treasury admin to approve or reject
- trigger execution after approval

Current branch note:
- Approval persistence, execution APIs, and the page-level approval queue are implemented.

### Audit Service

Responsibilities:

- record every request, policy check, execution result, and error
- create a full decision trail for demo and debugging

Current branch note:
- Audit events are persisted and surfaced in both the payment console detail flow and the dedicated audit page.

## 6. End-to-End Request Flow

### A. Auto-Approved Payment

1. User submits: `Pay contractor 250 USDT for February design work`
2. API validates payload and creates a `payment_request`
3. Agent service extracts:
   - vendor
   - amount
   - asset
   - category
   - memo
4. Policy engine checks:
   - vendor allowlist
   - per-transaction cap
   - budget usage
   - asset support
5. Policy engine returns `execute`
6. Wallet service sends transaction through WDK
7. Transaction refresh service later confirms or fails the submitted operation on demand
8. Audit service records:
   - original text
   - structured intent
   - policy evaluation
   - tx hash
   - final state

### B. Blocked Payment

1. User submits a payment to an unknown address
2. Agent parses the intent
3. Policy engine finds a hard violation
4. System returns `reject`
5. Audit log stores the reason and no wallet action occurs

### C. Escalated Payment

1. User submits a valid payment above the auto-approval threshold
2. Agent parses the intent
3. Policy engine returns `escalate`
4. Approval queue stores the request
5. Treasury admin approves in UI
6. Wallet service executes through WDK
7. Transaction refresh service later confirms or fails the submitted operation on demand
8. Audit log stores both the escalation and the final execution event

### D. Natural-Language Bridge Request

1. Treasury admin submits: `Bridge 250 USDt0 from Arbitrum to Solana recipient <solana-address> for settlement liquidity`
2. Agent service extracts:
   - source chain
   - destination chain
   - asset
   - amount
   - recipient
   - purpose
3. Policy engine checks:
   - route allowlist
   - supported asset
   - bridge threshold
   - treasury paused state
4. System returns `execute`, `escalate`, or `reject`
5. In the current demo runtime, the UI distinguishes `supported routes` from `live execution routes`
6. If a real Arbitrum bridge runtime is configured and enabled, bridge service invokes the verified WDK bridge route
7. Audit service records bridge request, policy evaluation, and execution state

### E. Agent-Submitted Payment Request

1. External agent sends a structured treasury request to the inbound agent channel
2. Agent gateway service normalizes the request and marks the source as `agent`
3. Agent service and policy engine run exactly as they would for a human request
4. System returns `execute`, `escalate`, or `reject`
5. Audit service stores the source agent identity and final result

Current branch note:
- This flow exists behind a feature flag and uses a constrained inbound API.

## 7. Recommended Network and Asset Choice

### MVP Recommendation

- Chain: Ethereum Sepolia
- Wallet Mode: ERC-4337
- Asset: test USDt

Why:

- WDK supports ERC-4337 wallets on Sepolia
- Sepolia is easier to demo safely than mainnet
- account abstraction improves demo UX for agent-led execution

### Fallback Option

If ERC-4337 setup becomes unstable during implementation, fall back to the simplest WDK-compatible EVM wallet path that still demonstrates direct WDK use and real transfers.

Current branch note:
- The current branch is already using the ERC-4337 path on Sepolia-oriented configuration with paymaster-token mode.

### Bridge Extension Note

Do not make bridge routing part of the critical demo path unless the chosen source and destination route is explicitly supported by the selected WDK bridge module and practical on the configured runtime. On the current branch, payments are demonstrated on Sepolia while bridge requests remain demo-safe unless a separate Arbitrum bridge runtime is configured.

## 8. Data Model

The MVP should use a small relational schema.

### `wallet_config`

- `id`
- `network`
- `wallet_type`
- `public_address`
- `encrypted_seed`
- `created_at`
- `updated_at`

Current branch note:
- This table is live and stores the latest encrypted wallet seed and public address.

### `vendors`

- `id`
- `name`
- `wallet_address`
- `asset`
- `category`
- `is_allowlisted`
- `is_blocked`
- `created_at`

### `treasury_policy`

- `id`
- `name`
- `per_tx_limit`
- `daily_limit`
- `weekly_limit`
- `auto_approval_limit`
- `allowed_assets`
- `allowed_categories`
- `require_allowlist`
- `paused`
- `updated_at`

### `payment_requests`

- `id`
- `raw_request`
- `requester_label`
- `request_source`
- `source_agent_id`
- `status`
- `created_at`

Current branch note:
- `request_source` propagation is implemented and visible in the payment console and dashboard.

Status values:

- `received`
- `executing`
- `executed`
- `escalated`
- `rejected`
- `failed`

### `agent_clients`

- `id`
- `name`
- `auth_token_hash`
- `callback_url`
- `status`
- `created_at`

### `bridge_requests`

- `id`
- `payment_request_id`
- `source_network`
- `destination_network`
- `recipient_address`
- `asset`
- `amount`
- `purpose`
- `bridge_status`
- `created_at`

### `payment_intents`

- `id`
- `payment_request_id`
- `recipient_address`
- `vendor_name`
- `asset`
- `amount`
- `category`
- `reason_summary`
- `llm_confidence`
- `created_at`

### `policy_evaluations`

- `id`
- `payment_request_id`
- `decision`
- `decision_reason`
- `rule_results_json`
- `created_at`

### `approvals`

- `id`
- `payment_request_id`
- `status`
- `reviewer_label`
- `review_notes`
- `created_at`

### `transactions`

- `id`
- `payment_request_id`
- `network`
- `asset`
- `amount`
- `tx_hash`
- `tx_status`
- `submitted_at`
- `confirmed_at`

### `audit_events`

- `id`
- `payment_request_id`
- `event_type`
- `payload_json`
- `created_at`

## 9. API Surface

### Wallet

- `POST /api/wallet/setup`
- `GET /api/wallet`
- `GET /api/wallet/balance`

### Policy

- `GET /api/policy`
- `PUT /api/policy`
- `GET /api/vendors`
- `POST /api/vendors`
- `PATCH /api/vendors/:id`

### Payments

- `POST /api/payments/request`
- `GET /api/payments`
- `GET /api/payments/:id`

### Bridge Routing

- `POST /api/bridges/request`
- `GET /api/bridges/:id`

### Approvals

- `GET /api/approvals`
- `POST /api/approvals/:id/approve`
- `POST /api/approvals/:id/reject`

### Audit

- `GET /api/audit`

### External Agent Intake

- `POST /api/agent/payments/request`

## 10. Service Boundaries

These boundaries should be kept even in a small codebase:

- `agent` can read policy context but cannot execute transactions
- `agent-gateway` can authenticate and normalize upstream requests but cannot bypass policy
- `policy` can evaluate intents but cannot sign transactions
- `wallet` can execute only after receiving a valid execution command
- `bridge` can execute only after receiving a valid execution command from the same policy pipeline
- `audit` can record events from every module but cannot influence decisions

## 11. Secret Handling

For the MVP:

- store wallet seed material encrypted at rest,
- load decryption key from environment variable or startup secret,
- never log raw secrets,
- keep decrypted secrets in memory only during wallet initialization or execution,
- separate demo wallet from any personal wallet.

## 12. Idempotency and Execution Safety

To prevent duplicate sends:

- assign every payment request a stable internal id,
- lock execution per request id,
- do not allow repeated execution once a transaction is submitted,
- record intermediate states like `executing` before sending.

Recommended rule:
- only one transaction record may exist in `submitted` or `confirmed` state per payment request.

## 13. Error Handling

The app should distinguish between:

- parsing failure,
- policy rejection,
- missing approval,
- wallet initialization failure,
- transaction submission failure,
- transaction confirmation delay.

Each error class should produce:

- a user-readable message,
- a structured audit event,
- a retry recommendation when safe.

## 14. Folder Structure

The fastest buildable structure is a single repo with clear server-side domains.

```text
/
├── PRD.md
├── TECHNICAL_ARCHITECTURE.md
├── package.json
├── tsconfig.json
├── next.config.ts
├── .env.example
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── public/
├── scripts/
│   ├── seed-demo-data.ts
│   └── smoke-test.ts
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── policy/page.tsx
│   │   ├── payments/page.tsx
│   │   ├── approvals/page.tsx
│   │   ├── audit/page.tsx
│   │   └── api/
│   │       ├── wallet/
│   │       │   ├── route.ts
│   │       │   └── balance/route.ts
│   │       ├── policy/route.ts
│   │       ├── vendors/route.ts
│   │       ├── payments/
│   │       │   ├── route.ts
│   │       │   └── [id]/route.ts
│   │       ├── approvals/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── approve/route.ts
│   │       │       └── reject/route.ts
│   │       └── audit/route.ts
│   ├── components/
│   │   ├── dashboard/
│   │   ├── policy/
│   │   ├── payments/
│   │   ├── approvals/
│   │   └── audit/
│   ├── lib/
│   │   ├── agent/
│   │   │   ├── runtime.ts
│   │   │   ├── parse-payment-request.ts
│   │   │   ├── summarize-decision.ts
│   │   │   └── types.ts
│   │   ├── agent-gateway/
│   │   │   └── service.ts
│   │   ├── bridge/
│   │   │   ├── service.ts
│   │   │   └── types.ts
│   │   ├── policy/
│   │   │   ├── engine.ts
│   │   │   ├── rules.ts
│   │   │   ├── limits.ts
│   │   │   └── types.ts
│   │   ├── wallet/
│   │   │   ├── client.ts
│   │   │   ├── create-wallet.ts
│   │   │   ├── get-balance.ts
│   │   │   ├── transfer-asset.ts
│   │   │   └── types.ts
│   │   ├── approvals/
│   │   │   └── service.ts
│   │   ├── audit/
│   │   │   └── service.ts
│   │   ├── db/
│   │   │   ├── client.ts
│   │   │   ├── queries.ts
│   │   │   └── repositories/
│   │   ├── schemas/
│   │   │   ├── payment.ts
│   │   │   ├── policy.ts
│   │   │   └── vendor.ts
│   │   ├── crypto/
│   │   │   └── encrypt.ts
│   │   ├── config/
│   │   │   └── env.ts
│   │   └── utils/
│   │       ├── money.ts
│   │       ├── ids.ts
│   │       └── time.ts
│   └── styles/
│       └── globals.css
└── tests/
    ├── policy/
    ├── api/
    └── e2e/
```

## 15. Folder Responsibility Notes

### `src/lib/agent`

- only handles interpretation and explanation
- never executes transactions

### `src/lib/policy`

- contains pure functions where possible
- highest-value test coverage should live here

### `src/lib/wallet`

- owns all WDK integration
- should expose a small application-friendly API

### `src/lib/audit`

- central place for event writes
- makes debugging and demo visibility easier

### `src/app/api`

- thin transport layer
- should call domain services, not hold business logic

## 16. Build Order

Implement in this order:

1. `db` schema and seed data
2. `wallet` service with setup and balance read
3. `policy` engine with unit tests
4. `agent` parsing flow
5. `payments/request` API
6. transaction execution path
7. approvals flow
8. audit log UI
9. polish and demo script

Optional extension order after the core MVP:

10. one supported bridge route
11. agent-submitted request intake

## 17. Minimum Test Plan

### Unit Tests

- policy rule evaluation
- spending cap logic
- allowlist and blocklist behavior
- request normalization

### Integration Tests

- request to execute flow
- request to escalate flow
- request to reject flow
- duplicate execution prevention

### Demo Smoke Tests

- wallet connects
- balance loads
- approved payment produces tx hash
- rejected payment writes audit record
- escalated payment waits for approval

## 18. Future Split If Needed

If the app grows beyond the hackathon MVP, split the single repo into:

- `apps/web`
- `packages/agent-core`
- `packages/policy-engine`
- `packages/wallet-adapter`
- `packages/shared`

Do not start there. The single-repo structure above is the better choice for speed.
