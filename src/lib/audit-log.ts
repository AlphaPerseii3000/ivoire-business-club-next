import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { sanitizeError, sanitizeForLog } from "@/lib/sanitize-log";

export const OPPORTUNITY_AUDIT_ACTIONS = {
  SUBSCRIPTION_VALIDATE: "SUBSCRIPTION_VALIDATE",
  SUBSCRIPTION_REJECT: "SUBSCRIPTION_REJECT",
  SUBSCRIPTION_SUSPEND: "SUBSCRIPTION_SUSPEND",
  OPPORTUNITY_STATUS_CHANGE: "OPPORTUNITY_STATUS_CHANGE",
  OPPORTUNITY_DOUBLE_VERIFICATION_APPROVE: "OPPORTUNITY_DOUBLE_VERIFICATION_APPROVE",
  OPPORTUNITY_UPDATE: "OPPORTUNITY_UPDATE",
  OPPORTUNITY_DELETE: "OPPORTUNITY_DELETE",
  DOCUMENT_DELETE: "DOCUMENT_DELETE",
  USER_TIER_UPDATE: "USER_TIER_UPDATE",
  USER_VERIFY: "USER_VERIFY",
  USER_SUSPEND: "USER_SUSPEND",
  USER_REACTIVATE: "USER_REACTIVATE",
  USER_CONFIRMATION_EMAIL_SEND: "USER_CONFIRMATION_EMAIL_SEND",
  USER_INVITATION_EMAIL_SEND: "USER_INVITATION_EMAIL_SEND",
  USER_REMINDER_SEND: "USER_REMINDER_SEND",
  ARTICLE_CREATE: "ARTICLE_CREATE",
  ARTICLE_UPDATE: "ARTICLE_UPDATE",
  ARTICLE_PUBLISH: "ARTICLE_PUBLISH",
  ARTICLE_UNPUBLISH: "ARTICLE_UNPUBLISH",
  ARTICLE_DELETE: "ARTICLE_DELETE",
  DOCUMENT_ACCESS_REQUESTED: "DOCUMENT_ACCESS_REQUESTED",
  DOCUMENT_ACCESS_APPROVED: "DOCUMENT_ACCESS_APPROVED",
  DOCUMENT_ACCESS_DENIED: "DOCUMENT_ACCESS_DENIED",
  DOCUMENT_VIEWED: "DOCUMENT_VIEWED",
  DOCUMENT_DOWNLOADED: "DOCUMENT_DOWNLOADED",
  COMMENT_CREATE: "COMMENT_CREATE",
  COMMENT_UPDATE: "COMMENT_UPDATE",
  COMMENT_DELETE: "COMMENT_DELETE",
  ONBOARDING_COMPLETED: "ONBOARDING_COMPLETED",
  ONBOARDING_SYNC_MIGRATION: "ONBOARDING_SYNC_MIGRATION",
  EVENT_CREATE: "EVENT_CREATE",
  EVENT_UPDATE: "EVENT_UPDATE",
  EVENT_PUBLISH: "EVENT_PUBLISH",
  EVENT_CANCEL: "EVENT_CANCEL",
  EVENT_DELETE: "EVENT_DELETE",
  EVENT_COVER_UPLOAD: "EVENT_COVER_UPLOAD",
  EVENT_REGISTRATION_UPDATE: "EVENT_REGISTRATION_UPDATE",
  EXPERT_CREATE: "EXPERT_CREATE",
  EXPERT_UPDATE: "EXPERT_UPDATE",
  EXPERT_PUBLISH: "EXPERT_PUBLISH",
  EXPERT_UNPUBLISH: "EXPERT_UNPUBLISH",
  EXPERT_DELETE: "EXPERT_DELETE",
  COMPANY_CREATE: "COMPANY_CREATE",
  COMPANY_UPDATE: "COMPANY_UPDATE",
  COMPANY_PUBLISH: "COMPANY_PUBLISH",
  COMPANY_UNPUBLISH: "COMPANY_UNPUBLISH",
  COMPANY_DELETE: "COMPANY_DELETE",
} as const;

export const AUDIT_ACTIONS = {
  ...OPPORTUNITY_AUDIT_ACTIONS,
  DOCUMENT_UPLOAD: "DOCUMENT_UPLOAD",
  FILE_SCAN_REJECTED: "FILE_SCAN_REJECTED",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export type CreateAuditLogInput = {
  actorId?: string | null;
  action: AuditAction | string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown> | null;
};

export async function createAuditLog(input: CreateAuditLogInput) {
  const sanitizedMetadata = input.metadata ? (sanitizeForLog(input.metadata) as Prisma.InputJsonValue) : undefined;

  return prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: sanitizedMetadata,
    },
  });
}

export async function safeCreateAuditLog(input: CreateAuditLogInput) {
  try {
    await createAuditLog(input);
  } catch (error) {
    console.error("[audit-log-create]", {
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      error: sanitizeError(error),
    });
  }
}

export type AuditLogQuery = {
  page: number;
  pageSize: number;
  action?: string;
  entityType?: string;
  actorId?: string;
  from?: Date;
  to?: Date;
  q?: string;
};

export async function queryAuditLogs(query: AuditLogQuery) {
  const where: Record<string, unknown> = {};
  if (query.action) where.action = query.action;
  if (query.entityType) where.entityType = query.entityType;
  if (query.actorId) where.actorId = query.actorId;
  if (query.from || query.to) {
    where.createdAt = {
      ...(query.from ? { gte: query.from } : {}),
      ...(query.to ? { lte: query.to } : {}),
    };
  }
  if (query.q) {
    where.OR = [
      { action: { contains: query.q } },
      { entityType: { contains: query.q } },
      { entityId: { contains: query.q } },
      { actorId: { contains: query.q } },
    ];
  }

  const skip = (query.page - 1) * query.pageSize;
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.pageSize,
      include: { actor: { select: { id: true, name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}
