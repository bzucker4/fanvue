-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "handle" TEXT,
    "fanvueUserUuid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSession" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OauthAttempt" (
    "state" TEXT NOT NULL,
    "codeVerifierCipher" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OauthAttempt_pkey" PRIMARY KEY ("state")
);

-- CreateTable
CREATE TABLE "OauthToken" (
    "workspaceId" TEXT NOT NULL,
    "accessCipher" TEXT NOT NULL,
    "refreshCipher" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scope" TEXT NOT NULL,
    "keyVersion" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OauthToken_pkey" PRIMARY KEY ("workspaceId")
);

-- CreateTable
CREATE TABLE "Fan" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "fanvueUuid" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sampleAsset" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ready',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuplicateEdge" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "leftUploadId" TEXT NOT NULL,
    "rightUploadId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DuplicateEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "fanId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL,
    "priceCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "invoiceId" TEXT,
    "textExcerpt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseAttachment" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "PurchaseAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reversal" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "purchaseId" TEXT,
    "invoiceId" TEXT,
    "externalId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amountCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reversal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SentOffer" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "fanId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "priceCents" INTEGER,
    "paidUploadIds" JSONB NOT NULL,
    "previewUploadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SentOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bundle" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleItem" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "BundleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleAudience" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "fanId" TEXT NOT NULL,

    CONSTRAINT "BundleAudience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportState" (
    "workspaceId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "historyComplete" BOOLEAN NOT NULL,
    "broadcastsIncluded" BOOLEAN NOT NULL,
    "lastSynchronizedAt" TIMESTAMP(3),
    "chatsDiscovered" INTEGER NOT NULL DEFAULT 0,
    "chatsImported" INTEGER NOT NULL DEFAULT 0,
    "messagesScanned" INTEGER NOT NULL DEFAULT 0,
    "purchasesImported" INTEGER NOT NULL DEFAULT 0,
    "gaps" JSONB NOT NULL,
    "unsupported" JSONB NOT NULL,
    "methodNote" TEXT NOT NULL,
    "lastError" TEXT,
    "billingMode" TEXT NOT NULL DEFAULT 'unknown',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportState_pkey" PRIMARY KEY ("workspaceId")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "type" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingHydration" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "messageId" TEXT,
    "fanvueFanId" TEXT,
    "invoiceId" TEXT,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingHydration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeletionRequest" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "contact" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'received',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_fanvueUserUuid_key" ON "Workspace"("fanvueUserUuid");

-- CreateIndex
CREATE UNIQUE INDEX "AppSession_workspaceId_key" ON "AppSession"("workspaceId");

-- CreateIndex
CREATE INDEX "Fan_workspaceId_idx" ON "Fan"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Fan_workspaceId_fanvueUuid_key" ON "Fan"("workspaceId", "fanvueUuid");

-- CreateIndex
CREATE INDEX "Upload_workspaceId_idx" ON "Upload"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Upload_workspaceId_mediaId_key" ON "Upload"("workspaceId", "mediaId");

-- CreateIndex
CREATE INDEX "DuplicateEdge_workspaceId_idx" ON "DuplicateEdge"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "DuplicateEdge_workspaceId_leftUploadId_rightUploadId_key" ON "DuplicateEdge"("workspaceId", "leftUploadId", "rightUploadId");

-- CreateIndex
CREATE INDEX "Purchase_workspaceId_fanId_idx" ON "Purchase"("workspaceId", "fanId");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_workspaceId_messageId_key" ON "Purchase"("workspaceId", "messageId");

-- CreateIndex
CREATE INDEX "PurchaseAttachment_uploadId_idx" ON "PurchaseAttachment"("uploadId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseAttachment_purchaseId_uploadId_role_key" ON "PurchaseAttachment"("purchaseId", "uploadId", "role");

-- CreateIndex
CREATE INDEX "Reversal_workspaceId_idx" ON "Reversal"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Reversal_workspaceId_externalId_key" ON "Reversal"("workspaceId", "externalId");

-- CreateIndex
CREATE INDEX "SentOffer_workspaceId_idx" ON "SentOffer"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "SentOffer_workspaceId_messageId_key" ON "SentOffer"("workspaceId", "messageId");

-- CreateIndex
CREATE INDEX "Bundle_workspaceId_idx" ON "Bundle"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "BundleItem_bundleId_uploadId_key" ON "BundleItem"("bundleId", "uploadId");

-- CreateIndex
CREATE UNIQUE INDEX "BundleAudience_bundleId_fanId_key" ON "BundleAudience"("bundleId", "fanId");

-- CreateIndex
CREATE INDEX "WebhookEvent_workspaceId_idx" ON "WebhookEvent"("workspaceId");

-- CreateIndex
CREATE INDEX "PendingHydration_workspaceId_status_idx" ON "PendingHydration"("workspaceId", "status");

-- AddForeignKey
ALTER TABLE "AppSession" ADD CONSTRAINT "AppSession_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OauthToken" ADD CONSTRAINT "OauthToken_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fan" ADD CONSTRAINT "Fan_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicateEdge" ADD CONSTRAINT "DuplicateEdge_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_fanId_fkey" FOREIGN KEY ("fanId") REFERENCES "Fan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseAttachment" ADD CONSTRAINT "PurchaseAttachment_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseAttachment" ADD CONSTRAINT "PurchaseAttachment_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reversal" ADD CONSTRAINT "Reversal_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reversal" ADD CONSTRAINT "Reversal_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentOffer" ADD CONSTRAINT "SentOffer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentOffer" ADD CONSTRAINT "SentOffer_fanId_fkey" FOREIGN KEY ("fanId") REFERENCES "Fan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bundle" ADD CONSTRAINT "Bundle_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleAudience" ADD CONSTRAINT "BundleAudience_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleAudience" ADD CONSTRAINT "BundleAudience_fanId_fkey" FOREIGN KEY ("fanId") REFERENCES "Fan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportState" ADD CONSTRAINT "ImportState_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingHydration" ADD CONSTRAINT "PendingHydration_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeletionRequest" ADD CONSTRAINT "DeletionRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

