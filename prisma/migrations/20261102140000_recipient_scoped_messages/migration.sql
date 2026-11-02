-- Preserve existing rows while preventing different broadcast recipients overwriting each other.
DROP INDEX "Purchase_workspaceId_messageId_key";
CREATE UNIQUE INDEX "Purchase_workspaceId_fanId_messageId_key" ON "Purchase"("workspaceId", "fanId", "messageId");
DROP INDEX "SentOffer_workspaceId_messageId_key";
CREATE UNIQUE INDEX "SentOffer_workspaceId_fanId_messageId_key" ON "SentOffer"("workspaceId", "fanId", "messageId");

ALTER TABLE "ImportState" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;
