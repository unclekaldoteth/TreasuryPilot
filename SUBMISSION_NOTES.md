# Submission Notes

This file collects the repo-level wording you can reuse in DoraHacks when you need to describe TreasuryPilot accurately and consistently.

## Agent Framework Positioning

Use this if judges or reviewers ask how the agent layer is implemented:

> TreasuryPilot uses an in-app agent runtime that serves as an equivalent agent framework for this project. It handles request interpretation, normalization, and decision preparation, while deterministic policy enforcement remains the final authority before any wallet action. The architecture is compatible with OpenClaw or another orchestration layer, but wallet authority stays inside the same policy and execution boundary.

Shorter version:

> TreasuryPilot uses a lightweight in-app agent runtime for reasoning and decision preparation, with deterministic policy checks as the final gate before WDK wallet execution.

## Third-Party Services And Pre-Built Components

Repo-level disclosure for the current branch:

- Official Tether packages:
  - `@tetherto/wdk`
  - `@tetherto/wdk-wallet`
  - `@tetherto/wdk-wallet-evm-erc-4337`
  - `@tetherto/wdk-protocol-bridge-usdt0-evm`
- Open-source application frameworks and tooling:
  - `Next.js`
  - `React`
  - `TypeScript`
  - `Prisma`
  - `Vitest`
  - `Tailwind CSS`
- Optional or environment-dependent external infrastructure:
  - PostgreSQL database
  - Sepolia RPC / bundler / paymaster endpoints from `.env.example`

Suggested submission wording:

> TreasuryPilot is built on official Tether WDK SDKs and standard open-source web tooling, including Next.js, React, TypeScript, Prisma, Tailwind CSS, and Vitest. Depending on environment configuration, the app may also use external RPC, bundler, paymaster, and PostgreSQL infrastructure for demo or deployment.

## Pre-Existing Code Disclosure

Suggested submission wording:

> TreasuryPilot is a custom hackathon application built on top of official Tether SDKs and standard open-source frameworks. The product-specific treasury logic, policy engine wiring, wallet flow, approvals, audit trail, and bridge request flow in this repository were assembled for this hackathon project rather than copied from a closed-source internal product.

If your team used any code outside this public repo history, extend that statement explicitly in the submission.

## Honest Runtime Positioning

Use this wording if you need to explain the demo boundary:

> TreasuryPilot demonstrates live WDK wallet flows for payments on a Sepolia-oriented setup. Cross-chain bridge requests are supported in the product flow and visible in the UI, but live bridge execution remains disabled in the current demo runtime unless a separate Arbitrum bridge runtime and bridge configuration are supplied.
