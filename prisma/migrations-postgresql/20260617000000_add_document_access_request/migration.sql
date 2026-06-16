-- CreateEnum: DocumentAccessRequestStatus
CREATE TYPE "DocumentAccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- CreateTable: document_access_requests
CREATE TABLE "document_access_requests" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "status" "DocumentAccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique requester + document
CREATE UNIQUE INDEX "document_access_requests_requesterId_documentId_key" ON "document_access_requests"("requesterId", "documentId");

-- CreateIndex: document + status lookup
CREATE INDEX "document_access_requests_documentId_status_idx" ON "document_access_requests"("documentId", "status");

-- CreateIndex: requester + status lookup
CREATE INDEX "document_access_requests_requesterId_status_idx" ON "document_access_requests"("requesterId", "status");

-- AddForeignKey: requester → users
ALTER TABLE "document_access_requests" ADD CONSTRAINT "document_access_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey: document → opportunity_documents
ALTER TABLE "document_access_requests" ADD CONSTRAINT "document_access_requests_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "opportunity_documents"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey: reviewedBy → users
ALTER TABLE "document_access_requests" ADD CONSTRAINT "document_access_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
