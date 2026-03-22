# TreasuryPilot

TreasuryPilot is a policy-controlled treasury agent built for the Tether WDK hackathon. It turns natural-language treasury requests into self-custodial wallet actions, then decides whether to execute, escalate, or reject them under explicit policy rules.

The current app is positioned for the `Agent Wallets` track:
- WDK wallet creation, balance reads, and ERC-4337 transfer submission
- policy-gated payment execution
- approvals and audit trail
- agent-submitted payment requests
- natural-language cross-chain bridge requests, including `Arbitrum -> Solana`, in demo-safe mode

## Problem And Solution

### Problem

Small teams, creators, and crypto-native operators still manage many treasury tasks manually. Routine stablecoin payments, collaborator payouts, and treasury movements are slow, repetitive, and easy to get wrong. Existing AI assistants may understand a request, but they usually cannot move money safely under explicit operational constraints.

### Solution

TreasuryPilot gives teams a self-custodial treasury agent with clear boundaries. It accepts natural-language treasury requests, turns them into structured intents, applies deterministic policy checks, and then either executes, escalates, or rejects the action through Tether WDK. Every decision is logged so treasury operations stay explainable, reviewable, and auditable.

### Goal

The goal of TreasuryPilot is to let teams delegate low-risk treasury operations to an agent without giving up control of funds. The product is designed to make AI agents real financial actors while keeping money movement grounded in explicit policies instead of prompt-only trust.

## Current Demo Boundaries

- Payments run on `Ethereum Sepolia` by default.
- Cross-chain bridge requests are supported in the app flow, but are `demo-safe` by default and do not execute live from the current runtime.
- Live bridge execution requires a real `Arbitrum` bridge runtime, verified bridge token config, spender config, and `WDK_BRIDGE_EXECUTION_ENABLED=true`.
- Non-EVM bridge routes such as `Solana` require an explicit recipient in the request text.
- The current agent layer is primarily deterministic and policy-driven. `OPENAI_API_KEY` is optional and not required for the local demo.

## What The App Does

### Payments
- Parse requests like `Pay Acme Labs 250 USDt for analytics`
- Apply treasury policy rules
- `execute`, `escalate`, or `reject`
- persist approvals, transactions, and audit events
- refresh pending transaction status from WDK receipts

### Agent Gateway
- Accept structured inbound payment requests from another agent
- tag requests with `request_source` and optional source agent identity
- keep TreasuryPilot as the final decision-maker

### Bridge Console
- Parse requests like `Bridge 250 USDt0 from Arbitrum to Solana recipient HyXJcgYpURfDhgzuyRL7zxP4FhLg7LZQMeDrR4MXZcMN for settlement liquidity`
- validate destination, asset, amount, and recipient format
- run the same policy evaluation model as payments
- show `supported routes` separately from `live execution routes`

### Dashboard And Operations
- live dashboard backed by Prisma and SQLite
- wallet posture and balance reads
- approval queue
- audit log
- policy and vendor views

## How It Works

### Payment flow
1. A user or agent submits a treasury request in natural language.
2. TreasuryPilot parses the request into a structured intent.
3. The policy engine checks limits, allowlists, asset rules, and approval thresholds.
4. The app decides to `execute`, `escalate`, or `reject`.
5. If executed, the server-side WDK wallet submits the transfer and stores transaction state.
6. Receipt refresh updates pending transactions to `confirmed` or `failed`.
7. Every step is written to the audit trail.

### Approval flow
1. Requests above the auto-approval threshold are escalated.
2. Reviewers open the approval queue and approve or reject the request.
3. On approval, TreasuryPilot can continue to execution.
4. The final decision and any transaction result are persisted and logged.

### Agent-submitted request flow
1. Another agent sends a structured request to the agent gateway.
2. TreasuryPilot stores the request with `request_source="agent"` and the source agent identity when available.
3. The same parsing, policy, approval, and audit pipeline is applied.
4. TreasuryPilot remains the final authority before any wallet action happens.

### Bridge flow
1. A user submits a bridge request such as `Bridge 250 USDt0 from Arbitrum to Solana recipient ...`.
2. TreasuryPilot parses source chain, destination chain, asset, amount, recipient, and purpose.
3. The bridge policy checks route support, request clarity, recipient validity, and treasury limits.
4. The bridge request is either executed, escalated, or rejected.
5. In the current demo runtime, supported routes are shown separately from live execution routes so the app does not overstate what is onchain.

## Tech Stack

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Prisma + SQLite`
- `Tether WDK`
- `Vitest`

## App Routes

- `/` landing page
- `/dashboard` treasury overview
- `/payments` payment request console
- `/approvals` approval queue
- `/audit` audit trail
- `/policy` policy and vendor configuration view
- `/bridges` cross-chain bridge console

## API Routes

- `POST /api/wallet`
- `GET /api/wallet/balance`
- `GET|POST /api/payments`
- `GET /api/payments/:id`
- `GET /api/approvals`
- `POST /api/approvals/:id/approve`
- `POST /api/approvals/:id/reject`
- `GET /api/audit`
- `GET /api/policy`
- `GET /api/vendors`
- `POST /api/agent/payments/request`
- `GET|POST /api/bridges/request`
- `GET /api/bridges/:id`

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create local environment

Copy `.env.example` to `.env.local` and adjust the values you need.

Minimal local demo example:

```env
DATABASE_URL="file:./prisma/test.db"
APP_ENCRYPTION_KEY="local-demo-encryption-key"
FEATURE_BRIDGE_ROUTING="true"
WDK_BRIDGE_ALLOWED_DESTINATIONS="optimism,polygon,ethereum,solana"
WDK_BRIDGE_EXECUTION_ENABLED="false"
```

If you want live Sepolia payment execution, also configure the WDK values from `.env.example` and set:

```env
WDK_EXECUTION_ENABLED="true"
```

### 3. Generate Prisma client

```bash
npm run db:generate
```

### 4. Push schema

```bash
npm run db:push
```

### 5. Seed demo data

```bash
npm run db:seed
```

### 6. Start the app

```bash
npm run dev
```

## Environment Variables

### Required
- `DATABASE_URL`
- `APP_ENCRYPTION_KEY`

### Optional agent/runtime
- `OPENAI_API_KEY`
- `FEATURE_AGENT_GATEWAY`
- `FEATURE_BRIDGE_ROUTING`

### WDK payment runtime
- `WDK_NETWORK`
- `WDK_CHAIN_ID`
- `WDK_RPC_URL`
- `WDK_BUNDLER_URL`
- `WDK_PAYMASTER_URL`
- `WDK_PAYMASTER_ADDRESS`
- `WDK_ENTRY_POINT_ADDRESS`
- `WDK_SAFE_MODULES_VERSION`
- `WDK_PAYMASTER_TOKEN_ADDRESS`
- `WDK_TRANSFER_MAX_FEE`
- `WDK_ASSET_SYMBOL`
- `WDK_ASSET_DECIMALS`
- `WDK_EXECUTION_ENABLED`

### WDK bridge runtime
- `WDK_BRIDGE_SOURCE_NETWORK`
- `WDK_BRIDGE_ALLOWED_DESTINATIONS`
- `WDK_BRIDGE_TOKEN_ADDRESS`
- `WDK_BRIDGE_SPENDER_ADDRESS`
- `WDK_BRIDGE_ASSET_SYMBOL`
- `WDK_BRIDGE_ASSET_DECIMALS`
- `WDK_BRIDGE_MAX_FEE`
- `WDK_BRIDGE_EXECUTION_ENABLED`

## Useful Commands

```bash
npm run dev
npm run build
npm run start
npm run typecheck
npm test
npm run db:generate
npm run db:push
npm run db:seed
```

## Testing

The repository includes tests for:
- Prisma persistence
- wallet creation and balance access
- transfer execution behavior
- transaction refresh
- bridge parsing and bridge execution behavior
- SQLite path resolution for Prisma in Next dev/runtime contexts

Run the suite with:

```bash
npm test
```

## Demo Requests

### Payment

```text
Pay Acme Labs 250 USDt for analytics
```

### Escalated payment

```text
Pay contractor 1200 USDt for March design sprint
```

### Bridge

```text
Bridge 250 USDt0 from Arbitrum to Optimism for payroll liquidity
```

### Bridge to Solana

```text
Bridge 250 USDt0 from Arbitrum to Solana recipient HyXJcgYpURfDhgzuyRL7zxP4FhLg7LZQMeDrR4MXZcMN for settlement liquidity
```

## Important Notes

- TreasuryPilot is intentionally conservative: the policy engine is the final gate before any wallet action.
- The app resolves relative SQLite paths to absolute paths at runtime so Prisma works reliably in Next dev and build contexts.
- Bridge support in this repo is built to be honest for demos. A supported route in the UI does not imply live execution is enabled.

## Supporting Docs

- [PRD.md](./PRD.md)
- [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md)
- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)
- [DORAHACKS_SUBMISSION_COPY.md](./DORAHACKS_SUBMISSION_COPY.md)
- [DEMO_SCRIPT.md](./DEMO_SCRIPT.md)
