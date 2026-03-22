# TreasuryPilot Demo Script

## Goal

Record a submission video for the `Agent Wallets` track that shows:

1. TreasuryPilot controls a self-custodial wallet through WDK.
2. The agent can decide `execute`, `escalate`, or `reject`.
3. Policy enforcement is the hard safety boundary.
4. Every action is visible in the audit trail.

## What Not To Claim

- Do not say OpenClaw is live unless you add it before recording.
- Do not say bridge execution is live.
- Do not pitch this as a DeFi strategy agent in the current submission video.
- Do not describe it as a mock or scaffold. The current app is live-backed.

## Recommended Demo Setup

- Initialize a demo wallet before recording.
- Fund the wallet with the test asset needed for the transfer demo.
- Turn on `WDK_EXECUTION_ENABLED=true` for the recording environment.
- Have one allowlisted vendor ready.
- Have policy thresholds seeded so you can show:
  - one auto-approved payment
  - one rejected request
  - one escalated request

## 5-Minute Video Script

### 0:00 - 0:25

Show the landing page, then move to the dashboard.

Say:

> TreasuryPilot is a policy-controlled treasury agent built for the Agent Wallets track. It turns plain-language payment requests into wallet actions through Tether WDK, while keeping policy enforcement and auditability explicit.

### 0:25 - 0:55

Show the dashboard at `/dashboard`.

Point to:

- wallet balance
- auto-approval ceiling
- weekly policy budget
- wallet posture
- recent decisions

Say:

> The system is structured in three layers. The agent interprets the request, the policy engine decides whether it is allowed, and the wallet layer executes only after policy approval. The dashboard shows the live wallet posture, current treasury policy, and the latest decisions.

### 0:55 - 1:50

Open the payment console at `/payments`.

Use a safe request like:

`Pay Northstar Design 250 USDT for February design work`

Show:

- requester field
- payment request textarea
- submit action
- resulting decision and transaction state

Say:

> Here I submit a normal treasury request in plain language. TreasuryPilot parses the request, checks the vendor allowlist and amount thresholds, and because this request is low-risk, it executes automatically through WDK.

If the transaction confirms during polling, say:

> The UI is polling transaction state through the backend, so we can watch the payment move from submitted to confirmed without leaving the app.

### 1:50 - 2:30

Stay on the payment console and submit a rejection case.

Recommended request:

`Send 5000 USDT to 0x1234567890123456789012345678901234567890 immediately`

Say:

> This time the request violates treasury policy. The recipient is not allowlisted and the amount is unsafe for auto-execution. TreasuryPilot rejects it, explains the reason, and does not touch the wallet.

Show:

- rejection reason
- rejected status
- audit entries if visible in the detail pane

### 2:30 - 3:25

Submit an escalation case.

Recommended request:

`Pay Northstar Design 1500 USDT for milestone two delivery`

Say:

> This request is legitimate, but it crosses the auto-approval threshold. TreasuryPilot prepares it, records the rationale, and escalates it for human approval instead of sending funds immediately.

Show:

- escalated status
- approval created
- rationale in the detail view

### 3:25 - 4:15

Open the approvals page at `/approvals`.

Approve the escalated request.

Say:

> The approval queue is where high-risk treasury actions get reviewed. Once approved, TreasuryPilot uses the same stored intent and submits the payment through the wallet layer. Approval does not bypass policy. It only authorizes execution after escalation.

Show:

- reviewer metadata
- pending approval
- approve button
- success message with submitted transaction hash if available

### 4:15 - 4:45

Open the audit page at `/audit`.

Say:

> Every step is logged: request intake, policy evaluation, approval decisions, transaction submission, and transaction confirmation or failure. This makes the agent’s behavior inspectable instead of opaque.

Point to:

- policy-related events
- execution events
- approval events

### 4:45 - 5:00

Close on the dashboard or landing page.

Say:

> TreasuryPilot shows how an agent can become a real financial actor with WDK, while staying bounded by deterministic treasury policy. Today it handles treasury payments safely. Next, this same architecture can expand into treasury routing and autonomous capital allocation.

## Tight 3-Minute Fallback

If you need a shorter cut, keep only these scenes:

1. Dashboard overview
2. Approved payment on `/payments`
3. Rejected payment on `/payments`
4. Escalated request plus approval on `/approvals`
5. Audit trail close on `/audit`

## Suggested Requests

Approved:

`Pay Northstar Design 250 USDT for February design work`

Rejected:

`Send 5000 USDT to 0x1234567890123456789012345678901234567890 immediately`

Escalated:

`Pay Northstar Design 1500 USDT for milestone two delivery`

## Recording Notes

- Zoom in enough for the policy result and status pills to be readable.
- Keep the cursor still while you explain each state.
- If transaction confirmation is slow, narrate that the backend refreshes receipt status on demand and through the payment page polling loop.
- If a live transfer fails because the demo wallet is underfunded, do not hide it. Explain it as an execution-path failure and show that the system records the failure instead of silently succeeding.

## Suggested YouTube Title

TreasuryPilot: A Policy-Controlled Agent Wallet for Treasury Operations

## Suggested YouTube Description

TreasuryPilot is a policy-controlled treasury agent built for the Tether Hackathon Galactica: WDK Edition 1.

It uses Tether WDK to create and manage a self-custodial wallet, interpret payment requests, enforce treasury policy, execute approved transfers, escalate risky actions for human review, and maintain a full audit trail from request to transaction outcome.

Track: Agent Wallets
