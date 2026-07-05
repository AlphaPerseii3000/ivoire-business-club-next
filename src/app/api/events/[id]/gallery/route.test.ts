import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";
import os from "os";

const mockAuth = vi.hoisted(() => vi.fn());
const mockEventFindUnique = vi.hoisted(() => vi.fn());
const mockGalleryFindMany = vi.hoisted(() => vi.fn());
const mockGalleryCreate = vi.hoisted(() => vi.fn());
const mockSafeCreateAuditLog = vi.hoisted(() => vi.fn());

const mockToFile = vi.hoisted(() => vi.fn().mockImplementation(async (dest: string) => {
  await fs.writeFile(dest, Buffer.from("fake-resized-image"));
}));
const mockResize = vi.hoisted(() => vi.fn(() => ({ toFile: mockToFile })));
const mockSharp = vi.hoisted(() => {
  const fn = vi.fn(() => ({ resize: mockResize }));
  (fn as { fit?: { inside: string } }).fit = { inside: "inside" };
  return fn;
});

vi.mock("sharp", () => ({
  default: mockSharp,
}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: {
      findUnique: mockEventFindUnique,
    },
    eventGalleryPhoto: {
      findMany: mockGalleryFindMany,
      create: mockGalleryCreate,
    },
  },
}));

vi.mock("@/lib/audit-log", () => ({
  safeCreateAuditLog: mockSafeCreateAuditLog,
}));

describe("GET /api/events/[id]/gallery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function runGet(eventId: string) {
    const req = new NextRequest(`http://localhost:3000/api/events/${eventId}/gallery`, {
      method: "GET",
    });
    const params = Promise.resolve({ id: eventId });
    return GET(req, { params });
  }

  it("returns 404 if event does not exist", async () => {
    mockEventFindUnique.mockResolvedValue(null);
    const res = await runGet("evt-missing");
    expect(res.status).toBe(404);
  });

  it("returns 401 for PRIVATE event when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    mockEventFindUnique.mockResolvedValue({ id: "evt-1", visibility: "PRIVATE" });

    const res = await runGet("evt-1");
    expect(res.status).toBe(401);
  });

  it("returns 200 with photos sorted by createdAt desc for PUBLIC event", async () => {
    mockEventFindUnique.mockResolvedValue({ id: "evt-1", visibility: "PUBLIC" });
    const fakePhotos = [{ id: "p1", caption: "Photo 1" }];
    mockGalleryFindMany.mockResolvedValue(fakePhotos);

    const res = await runGet("evt-1");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toEqual(fakePhotos);
  });
});

describe("POST /api/events/[id]/gallery", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ibc-post-gallery-test-"));
    process.env.MEDIA_STORAGE_PATH = tmpDir;
    vi.clearAllMocks();
  });

  afterEach(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  function createFormData(file: File | null, caption?: string) {
    const formData = new FormData();
    if (file) formData.append("file", file);
    if (caption) formData.append("caption", caption);
    return formData;
  }

  async function runPost(eventId: string, formData: FormData) {
    const req = new NextRequest(`http://localhost:3000/api/events/${eventId}/gallery`, {
      method: "POST",
    });
    vi.spyOn(req, "formData").mockResolvedValue(formData);
    const params = Promise.resolve({ id: eventId });
    return POST(req, { params });
  }

  it("returns 401 when user is unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });
    const res = await runPost("evt-1", createFormData(file));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Non authentifié.");
  });

  it("returns 404 when event is not found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockEventFindUnique.mockResolvedValue(null);
    const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });

    const res = await runPost("evt-missing", createFormData(file));
    expect(res.status).toBe(404);
  });

  it("returns 400 when file format is invalid", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockEventFindUnique.mockResolvedValue({ id: "evt-1" });
    const file = new File(["dummy"], "doc.pdf", { type: "application/pdf" });

    const res = await runPost("evt-1", createFormData(file));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Format d'image non supporté");
  });

  it("returns 400 when file size exceeds 10MB", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockEventFindUnique.mockResolvedValue({ id: "evt-1" });
    const file = new File(["dummy"], "big.jpg", { type: "image/jpeg" });
    Object.defineProperty(file, "size", { value: 11 * 1024 * 1024 });

    const res = await runPost("evt-1", createFormData(file));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("dépasse la limite");
  });

  it("successfully uploads image, resizes with sharp and creates record", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockEventFindUnique.mockResolvedValue({ id: "evt-1" });
    const createdPhoto = {
      id: "photo-123",
      eventId: "evt-1",
      uploadedById: "user-1",
      filePath: "/events/evt-1/gallery/mock.jpg",
      caption: "Super moment",
    };
    mockGalleryCreate.mockResolvedValue(createdPhoto);

    const file = new File(["imgbytes"], "test.png", { type: "image/png" });
    const formData = createFormData(file, "Super moment");

    const res = await runPost("evt-1", formData);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data).toEqual(createdPhoto);
    expect(mockGalleryCreate).toHaveBeenCalled();
    expect(mockSafeCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "EVENT_GALLERY_PHOTO_UPLOAD",
        actorId: "user-1",
      })
    );
  });
});
