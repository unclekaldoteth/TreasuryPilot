# TreasuryPilot

TreasuryPilot is a policy-controlled treasury agent built for the Tether WDK hackathon. It turns plain-language treasury requests into self-custodial wallet actions, then deterministically decides whether to `execute`, `escalate`, or `reject`.

This repo is trimmed for public judging: source code, setup, and one demo guide only.

## Why It Matters

Treasury teams still handle many stablecoin operations manually. Existing AI assistants can interpret requests, but they usually cannot move funds under explicit operational controls. TreasuryPilot is built around that missing boundary:

- natural-language request intake
- deterministic treasury policy checks
- WDK-backed wallet execution
- approval gating for higher-risk actions
- full audit visibility from request to transaction state

## What Judges Can Verify Quickly

- Create or load a self-custodial wallet with Tether WDK
- Read wallet balance and treasury posture from the dashboard
- Submit a safe payment request and auto-execute it through WDK
- Submit a risky request and see explicit policy rejection
- Submit a high-value request and see escalation into approvals
- Review the resulting audit trail and transaction lifecycle
- Submit bridge requests in demo-safe mode without overstating live support

## Product Scope

### Current live path

- WDK wallet creation and import
- balance reads
- ERC-4337 payment submission
- approval queue
- audit trail
- vendor and treasury policy views
- agent-submitted request lane

### Current demo boundary

- Payments run on `Ethereum Sepolia` by default.
- Bridge requests are supported in the app flow, but live bridge execution stays off by default.
- `OPENAI_API_KEY` is optional. The shipped demo flow does not require it.
- Policy enforcement is the hard gate before any wallet action.

## How It Works

1. A user or external agent submits a treasury request in natural language.
2. TreasuryPilot parses the request into a structured intent.
3. The policy engine applies allowlists, amount limits, asset checks, and approval thresholds.
4. The system decides to `execute`, `escalate`, or `reject`.
5. If approved, the WDK wallet submits the transaction and TreasuryPilot persists the resulting state.
6. Approval events, execution events, and receipt updates are written to the audit trail.

## WDK Usage

TreasuryPilot uses Tether WDK as an execution layer, not as a cosmetic integration:

- wallet creation and import
- balance reads
- payment submission
- receipt refresh
- bridge-routing extension points behind explicit feature flags

## Judge Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create local env:

```bash
cp .env.example .env.local
```

Minimal local demo values:

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/treasurypilot?schema=public"
APP_ENCRYPTION_KEY="local-demo-encryption-key"
FEATURE_BRIDGE_ROUTING="true"
WDK_BRIDGE_ALLOWED_DESTINATIONS="optimism,polygon,ethereum,solana"
WDK_BRIDGE_EXECUTION_ENABLED="false"
```

If you want live Sepolia payment execution, also fill the WDK values from `.env.example` and set:

```env
WDK_EXECUTION_ENABLED="true"
```

3. Prepare the database:

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

4. Start the app:

```bash
npm run dev
```

## Main Routes

- `/dashboard` treasury overview
- `/payments` payment request console
- `/approvals` approval queue
- `/audit` audit trail
- `/policy` treasury policy and vendor view
- `/bridges` bridge request console

## Demo Requests

Approved payment:

```text
Pay Acme Labs 250 USDt for analytics
```

Escalated payment:

```text
Pay contractor 1200 USDt for March design sprint
```

Bridge request:

```text
Bridge 250 USDt0 from Arbitrum to Optimism for payroll liquidity
```

## Validation

```bash
npm test
npm run build
```

`npm test` always runs the pure unit tests. The Postgres-backed integration suites also run when `TEST_DATABASE_URL` is configured in `.env.test.local` and the test database has been migrated.

## Vercel Deployment

1. Connect the repo to Vercel.
2. Provision a managed Postgres database and set `DATABASE_URL` in Vercel.
3. Set `APP_ENCRYPTION_KEY` and the required WDK environment variables.
4. Apply migrations before or during deployment with:

```bash
npm run db:migrate
```

## Tech Stack

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Prisma + Postgres`
- `Tether WDK`
- `Vitest`

## Demo Guide

For the recorded walkthrough flow, see [DEMO_SCRIPT.md](./DEMO_SCRIPT.md).

## Submission Disclosures

### License

This repository is licensed under `Apache-2.0`. See [LICENSE](./LICENSE).

### Third-party services and pre-built components

TreasuryPilot depends on official Tether WDK SDKs and standard open-source application tooling:

- `@tetherto/wdk`
- `@tetherto/wdk-wallet`
- `@tetherto/wdk-wallet-evm-erc-4337`
- `@tetherto/wdk-protocol-bridge-usdt0-evm`
- `Next.js`
- `React`
- `TypeScript`
- `Prisma`
- `Tailwind CSS`
- `Vitest`

Depending on environment configuration, the app may also use external PostgreSQL, RPC, bundler, and paymaster infrastructure for demo or deployment.

### Pre-existing code disclosure

TreasuryPilot is a custom hackathon application built on top of official Tether SDKs and standard open-source frameworks. The product-specific treasury logic, policy engine wiring, wallet flow, approvals, audit trail, and bridge request flow in this repository were assembled for this project rather than copied from a closed-source internal product.

If your team reused additional code outside this public repository history, disclose that explicitly in the DoraHacks submission.

### Agent framework note

TreasuryPilot uses an in-app agent runtime that serves as an equivalent agent framework for this project. It handles request interpretation, normalization, and decision preparation, while deterministic policy enforcement remains the final authority before any wallet action. The architecture is compatible with OpenClaw or another orchestration layer, but wallet authority stays inside the same policy and execution boundary.

For reusable submission wording, see [SUBMISSION_NOTES.md](./SUBMISSION_NOTES.md).

## Important Notes

- TreasuryPilot is intentionally conservative: the policy engine is the final gate before any wallet action.
- For Vercel, deploy the app on Vercel and use a managed Postgres database exposed through `DATABASE_URL`.
- Bridge support in this repo is built to be honest for demos. A supported route in the UI does not imply live execution is enabled.
