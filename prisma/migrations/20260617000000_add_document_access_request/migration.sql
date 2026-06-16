-- CreateTable
CREATE TABLE "document_access_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requesterId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "document_access_requests_requesterId_documentId_key" ON "document_access_requests"("requesterId", "documentId");

-- CreateIndex
CREATE INDEX "document_access_requests_documentId_status_idx" ON "document_access_requests"("documentId", "status");

-- CreateIndex
CREATE INDEX "document_access_requests_requesterId_status_idx" ON "document_access_requests"("requesterId", "status");

-- AddForeignKey
ALTER TABLE "document_access_requests" ADD CONSTRAINT "document_access_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "document_access_requests" ADD CONSTRAINT "document_access_requests_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "opportunity_documents"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "document_access_requests" ADD CONSTRAINT "document_access_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;