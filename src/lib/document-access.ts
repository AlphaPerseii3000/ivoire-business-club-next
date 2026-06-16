import { prisma } from "@/lib/prisma";

export type DocumentAccessSession = {
  userId: string;
  role: string;
};

export function canManageDocuments(session: DocumentAccessSession, authorId: string) {
  return session.userId === authorId || session.role === "ADMIN";
}

/**
 * Check if a user has an APPROVED DocumentAccessRequest for a specific document.
 */
export async function hasApprovedAccess(requesterId: string, documentId: string): Promise<boolean> {
  const request = await prisma.documentAccessRequest.findUnique({
    where: { requesterId_documentId: { requesterId, documentId } },
    select: { status: true },
  });
  return request?.status === "APPROVED";
}

/**
 * Determine if a user can view a document.
 * Returns true if they are the opportunity author, an admin, or have an APPROVED access request.
 */
export async function canViewDocument(
  session: DocumentAccessSession,
  documentId: string,
  opportunityAuthorId: string,
): Promise<boolean> {
  // Author or admin can always view
  if (session.userId === opportunityAuthorId || session.role === "ADMIN") {
    return true;
  }

  return hasApprovedAccess(session.userId, documentId);
}

/**
 * Get the access status for a batch of documents for a given user.
 * Returns a Map<documentId, "locked" | "pending" | "denied" | "approved">.
 */
export async function getAccessStatusForDocuments(
  userId: string,
  documentIds: string[],
): Promise<Map<string, "locked" | "pending" | "denied" | "approved">> {
  const map = new Map<string, "locked" | "pending" | "denied" | "approved">();
  if (documentIds.length === 0) return map;

  const requests = await prisma.documentAccessRequest.findMany({
    where: { requesterId: userId, documentId: { in: documentIds } },
    select: { documentId: true, status: true },
  });

  for (const id of documentIds) {
    const req = requests.find((r) => r.documentId === id);
    if (!req) {
      map.set(id, "locked");
    } else {
      const statusLower = req.status.toLowerCase() as "pending" | "denied" | "approved";
      map.set(id, statusLower);
    }
  }
  return map;
}

/**
 * Get all PENDING access requests for documents belonging to an opportunity.
 */
export async function getPendingAccessRequests(opportunityId: string) {
  return prisma.documentAccessRequest.findMany({
    where: {
      status: "PENDING",
      document: { opportunityId },
    },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      document: { select: { id: true, originalName: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}