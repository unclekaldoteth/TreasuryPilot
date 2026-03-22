# TreasuryPilot DoraHacks Submission Copy

## Recommended Submission

- Project name: TreasuryPilot
- Primary track: Agent Wallets
- Positioning: Policy-controlled treasury agent powered by WDK

## One-Line Pitch

TreasuryPilot is an AI treasury operator that turns plain-language payment requests into policy-checked wallet actions with a full audit trail.

## Short Description

TreasuryPilot is a policy-controlled agent wallet for treasury operations. It reads natural-language payment requests, applies deterministic treasury rules, then executes, escalates, or rejects the action through Tether WDK with an auditable on-chain trail.

## Submission Description

TreasuryPilot makes agents real financial actors without turning money movement into a prompt-only trust exercise.

Users connect a self-custodial treasury wallet, define treasury policy, and submit payment requests in natural language. TreasuryPilot interprets the request, evaluates hard rules such as vendor allowlists, spend thresholds, and approval limits, and then decides whether to execute, escalate, or reject the action. If a payment is approved, TreasuryPilot submits the transaction through Tether WDK and records the resulting transaction lifecycle in a visible audit trail.

The core design principle is separation of concerns: agent reasoning interprets intent, deterministic policy enforcement decides what is allowed, and WDK handles wallet execution. This lets TreasuryPilot act autonomously on low-risk treasury tasks while keeping high-risk actions behind explicit review.

## Problem

Small teams, creator businesses, and crypto-native operators still handle treasury tasks manually. Routine contractor payouts, vendor payments, and stablecoin treasury movements are slow, repetitive, and error-prone. Existing AI assistants may understand requests, but they usually cannot move money safely under explicit constraints.

## Solution

TreasuryPilot gives teams a self-custodial treasury agent with clear operational boundaries:

- natural-language request intake
- deterministic policy checks
- automatic execution for low-risk actions
- approval gating for higher-risk actions
- rejection with explicit reasons for unsafe requests
- on-chain execution through WDK
- transaction and decision auditability from request to final status

## What We Built

- WDK wallet creation and wallet import
- encrypted wallet seed storage
- live wallet balance reads
- live WDK transfer submission behind an execution safety flag
- persisted payment requests, approvals, transactions, audit events, policy records, and vendor records
- receipt refresh flow that updates submitted transfers to confirmed or failed
- live payment console, dashboard, approval queue, audit page, and policy overview
- agent-submitted request lane scaffold with request source tracking

## Why It Fits Agent Wallets

TreasuryPilot is built around the exact boundary this track cares about: an agent that can hold, manage, and move funds through WDK under explicit controls.

- WDK primitives are central, not decorative
- the agent performs real wallet actions
- policy enforcement is clearly separated from wallet execution
- the product demonstrates permissions, limits, approval gates, and recovery-oriented thinking
- the system supports both human-submitted and agent-submitted requests without bypassing the treasury authority

## Demo Story

The strongest 5-minute demo flow is:

1. Show wallet setup and treasury balance.
2. Submit a safe payment request to an allowlisted vendor and let TreasuryPilot execute it.
3. Submit a risky request and show policy rejection with a clear reason.
4. Submit a high-value request and show escalation into the approval queue.
5. Approve the escalated request and show the transaction lifecycle plus audit trail.

## Honest Technical Positioning

Use this wording if you need to describe the agent layer precisely:

TreasuryPilot currently uses an in-app agent runtime for request interpretation and decision preparation, with deterministic policy enforcement as the final gate before any wallet action. The architecture is compatible with OpenClaw or another orchestration layer, but wallet authority remains inside the same policy and execution boundary.

This is important because it stays accurate to the current implementation and avoids overstating what is already live.

## Future Roadmap

TreasuryPilot is intentionally positioned for Agent Wallets today, with a clear path toward Autonomous DeFi Agent capabilities later.

Planned extensions:

- natural-language treasury routing across one verified WDK-supported bridge route
- agent-submitted treasury requests through a controlled inbound lane
- treasury deployment into DeFi strategies with explicit risk controls
- policy-aware liquidity rebalancing and treasury withdrawals

## Judge Talking Points

- This is not a chatbot with wallet access.
- The LLM or parser can interpret requests, but deterministic policy decides whether execution is allowed.
- WDK is the execution backbone for wallet operations.
- Every action is observable, reviewable, and tied to transaction state.
- The product is useful immediately for real treasury workflows and can expand into autonomous treasury allocation over time.

## Suggested Submission Tags

- Agent Wallets
- WDK
- treasury
- stablecoins
- policy engine
- autonomous payments
- audit trail
- self-custodial wallet
