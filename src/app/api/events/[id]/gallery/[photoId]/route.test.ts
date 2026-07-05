import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE } from "./route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";

const mockAuth = vi.hoisted(() => vi.fn());
const mockPhotoFindUnique = vi.hoisted(() => vi.fn());
const mockPhotoDelete = vi.hoisted(() => vi.fn());
const mockSafeCreateAuditLog = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    eventGalleryPhoto: {
      findUnique: mockPhotoFindUnique,
      delete: mockPhotoDelete,
    },
  },
}));

vi.mock("@/lib/audit-log", () => ({
  safeCreateAuditLog: mockSafeCreateAuditLog,
}));

vi.mock("fs/promises", () => ({
  default: {
    unlink: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("DELETE /api/events/[id]/gallery/[photoId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function runDelete(eventId: string, photoId: string) {
    const req = new NextRequest(`http://localhost:3000/api/events/${eventId}/gallery/${photoId}`, {
      method: "DELETE",
    });
    const params = Promise.resolve({ id: eventId, photoId });
    return DELETE(req, { params });
  }

  it("returns 401 when user is not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await runDelete("evt-1", "photo-1");
    expect(res.status).toBe(401);
  });

  it("returns 404 when photo does not exist or eventId does not match", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "MEMBER" } });
    mockPhotoFindUnique.mockResolvedValue(null);

    const res = await runDelete("evt-1", "photo-missing");
    expect(res.status).toBe(404);
  });

  it("returns 403 when user is not admin nor owner of photo", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-2", role: "MEMBER" } });
    mockPhotoFindUnique.mockResolvedValue({
      id: "photo-1",
      eventId: "evt-1",
      uploadedById: "user-1",
      filePath: "/events/evt-1/gallery/p1.jpg",
    });

    const res = await runDelete("evt-1", "photo-1");
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Action non autorisée.");
  });

  it("allows deletion by ADMIN user", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockPhotoFindUnique.mockResolvedValue({
      id: "photo-1",
      eventId: "evt-1",
      uploadedById: "user-1",
      filePath: "/events/evt-1/gallery/p1.jpg",
    });
    mockPhotoDelete.mockResolvedValue({ id: "photo-1" });

    const res = await runDelete("evt-1", "photo-1");
    expect(res.status).toBe(200);
    expect(mockPhotoDelete).toHaveBeenCalledWith({ where: { id: "photo-1" } });
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "EVENT_GALLERY_PHOTO_DELETE",
        actorId: "admin-1",
      })
    );
  });

  it("allows deletion by photo owner MEMBER", async () => {
    mockAuth.mockResolvedValue({ user: { id: "owner-1", role: "MEMBER" } });
    mockPhotoFindUnique.mockResolvedValue({
      id: "photo-1",
      eventId: "evt-1",
      uploadedById: "owner-1",
      filePath: "/events/evt-1/gallery/p1.jpg",
    });
    mockPhotoDelete.mockResolvedValue({ id: "photo-1" });

    const res = await runDelete("evt-1", "photo-1");
    expect(res.status).toBe(200);
    expect(mockPhotoDelete).toHaveBeenCalledWith({ where: { id: "photo-1" } });
  });
});
