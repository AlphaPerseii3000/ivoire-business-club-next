export type DocumentAccessSession = {
  userId: string;
  role: string;
};

export function canManageDocuments(session: DocumentAccessSession, authorId: string) {
  return session.userId === authorId || session.role === "ADMIN";
}
