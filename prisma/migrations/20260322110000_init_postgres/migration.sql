-- CreateTable
CREATE TABLE "WalletConfig" (
    "id" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "walletType" TEXT NOT NULL,
    "publicAddress" TEXT NOT NULL,
    "encryptedSeed" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isAllowlisted" BOOLEAN NOT NULL DEFAULT true,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreasuryPolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "perTxLimit" DOUBLE PRECISION NOT NULL,
    "dailyLimit" DOUBLE PRECISION NOT NULL,
    "weeklyLimit" DOUBLE PRECISION NOT NULL,
    "autoApprovalLimit" DOUBLE PRECISION NOT NULL,
    "allowedAssets" TEXT NOT NULL,
    "allowedCategories" TEXT NOT NULL,
    "requireAllowlist" BOOLEAN NOT NULL DEFAULT true,
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreasuryPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRequest" (
    "id" TEXT NOT NULL,
    "rawRequest" TEXT NOT NULL,
    "requester" TEXT,
    "requestSource" TEXT NOT NULL DEFAULT 'human',
    "sourceAgentId" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentClient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "authTokenHash" TEXT NOT NULL,
    "callbackUrl" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BridgeRequest" (
    "id" TEXT NOT NULL,
    "paymentRequestId" TEXT NOT NULL,
    "sourceNetwork" TEXT NOT NULL,
    "destinationNetwork" TEXT NOT NULL,
    "recipientAddress" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "purpose" TEXT NOT NULL,
    "bridgeStatus" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BridgeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentIntent" (
    "id" TEXT NOT NULL,
    "paymentRequestId" TEXT NOT NULL,
    "recipientAddress" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL,
    "reasonSummary" TEXT NOT NULL,
    "llmConfidence" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyEvaluation" (
    "id" TEXT NOT NULL,
    "paymentRequestId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "decisionReason" TEXT NOT NULL,
    "ruleResultsJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "paymentRequestId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reviewerLabel" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "paymentRequestId" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "txHash" TEXT,
    "txStatus" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "paymentRequestId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_walletAddress_key" ON "Vendor"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "AgentClient_authTokenHash_key" ON "AgentClient"("authTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "BridgeRequest_paymentRequestId_key" ON "BridgeRequest"("paymentRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntent_paymentRequestId_key" ON "PaymentIntent"("paymentRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyEvaluation_paymentRequestId_key" ON "PolicyEvaluation"("paymentRequestId");

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_sourceAgentId_fkey" FOREIGN KEY ("sourceAgentId") REFERENCES "AgentClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BridgeRequest" ADD CONSTRAINT "BridgeRequest_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "PaymentRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "PaymentRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyEvaluation" ADD CONSTRAINT "PolicyEvaluation_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "PaymentRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "PaymentRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "PaymentRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "PaymentRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

