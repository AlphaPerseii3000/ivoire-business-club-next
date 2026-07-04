import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import {
  COVER_ALLOWED_TYPES,
  COVER_MAX_SIZE_BYTES,
} from "@/lib/cover-upload-config";
import { auth } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";
import os from "os";

const mockAuth = vi.hoisted(() => vi.fn());
const mockEventFindUnique = vi.hoisted(() => vi.fn());
const mockEventUpdate = vi.hoisted(() => vi.fn());
const mockSafeCreateAuditLog = vi.hoisted(() => vi.fn());
const mockSharp = vi.hoisted(() => {
  const toFile = vi.fn().mockImplementation((filePath: string) => fs.writeFile(filePath, Buffer.from([])).then(() => undefined));
  const resize = vi.fn(() => ({ toFile }));
  const sharpMocked = vi.fn(() => ({
    resize,
  }));
  (sharpMocked as { fit?: { inside: string } }).fit = { inside: "inside" };
  return sharpMocked;
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
      update: mockEventUpdate,
    },
  },
}));

vi.mock("@/lib/audit-log", () => ({
  safeCreateAuditLog: mockSafeCreateAuditLog,
}));

function createFormDataWithFile(file: File): FormData {
  const formData = new FormData();
  formData.append("cover", file);
  return formData;
}

function createFile(name = "cover.jpg", type = "image/jpeg", size = 1024): File {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

function getPngArrayBuffer(): ArrayBuffer {
  // PNG minimal 1x1 rouge
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
    0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0x0f, 0x00, 0x00,
    0x01, 0x01, 0x00, 0x05, 0x18, 0xd8, 0x4e, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]).buffer;
}

function createValidPngFile(): File {
  const ab = getPngArrayBuffer();
  return new File([ab], "cover.png", { type: "image/png" });
}

function createValidJpegFile(): File {
  const buffer = new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
  ]);
  return new File([buffer], "cover.jpg", { type: "image/jpeg" });
}

function createValidWebpFile(): File {
  const buffer = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0x1e, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);
  return new File([buffer], "cover.webp", { type: "image/webp" });
}

function createMagicBytesOnlyFile(): File {
  // GIF signature déguisé avec extension png et type image/png
  const buffer = new Uint8Array([
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);
  return new File([buffer], "cover.png", { type: "image/png" });
}

describe("POST /api/admin/events/[id]/cover", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ibc-cover-test-"));
    process.env.MEDIA_STORAGE_PATH = tmpDir;
    vi.clearAllMocks();
  });

  afterEach(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  async function runUpload(
    file: File,
    eventId: string,
    userRole = "ADMIN",
    overrides?: { formData?: FormData }
  ) {
    mockAuth.mockResolvedValue({
      user: { id: "admin-1", role: userRole },
    });

    const req = new NextRequest(`http://localhost:3000/api/admin/events/${eventId}/cover`, {
      method: "POST",
      body: new FormData(),
    });

    if (overrides?.formData) {
      vi.spyOn(req, "formData").mockResolvedValue(overrides.formData);
    }

    const params = Promise.resolve({ id: eventId });
    return POST(req, { params });
  }

  it("rejects non-authenticated users", async () => {
    const file = createValidJpegFile();
    const formData = createFormDataWithFile(file);
    mockAuth.mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/admin/events/evt-1/cover", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req, { params: Promise.resolve({ id: "evt-1" }) });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Non authentifié.");
  });

  it("rejects non-admin users", async () => {
    const file = createValidJpegFile();
    const res = await runUpload(file, "evt-1", "MEMBER");
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Accès réservé aux administrateurs.");
  });

  it("returns 404 when event does not exist", async () => {
    const file = createValidJpegFile();
    mockEventFindUnique.mockResolvedValue(null);

    const formData = createFormDataWithFile(file);
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });

    const req = new NextRequest("http://localhost:3000/api/admin/events/evt-missing/cover", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req, { params: Promise.resolve({ id: "evt-missing" }) });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Événement introuvable.");
  });

  it("rejects files exceeding 5 Mo", async () => {
    const mockFile = {
      type: "image/jpeg",
      size: COVER_MAX_SIZE_BYTES + 1,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    } as unknown as File;
    const mockFormData = { get: vi.fn(() => mockFile) } as unknown as FormData;

    const res = await runUpload(new File([], "cover.jpg"), "evt-1", "ADMIN", { formData: mockFormData });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Fichier image requis (jpeg, png, webp, max 5 Mo).");
    expect(body.code).toBe("INVALID_FILE");
  });

  it("rejects unsupported mime types", async () => {
    const file = createFile("cover.gif", "image/gif", 1024);
    const res = await runUpload(file, "evt-1");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Fichier image requis (jpeg, png, webp, max 5 Mo).");
    expect(body.code).toBe("INVALID_FILE");
  });

  it("rejects files with wrong magic bytes", async () => {
    const mockFile = {
      type: "image/png",
      size: 1024,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    } as unknown as File;
    const mockFormData = { get: vi.fn(() => mockFile) } as unknown as FormData;

    mockEventFindUnique.mockResolvedValue({
      id: "evt-1",
      title: "Test Event",
    });

    const res = await runUpload(new File([], "cover.png"), "evt-1", "ADMIN", { formData: mockFormData });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Format d'image non valide.");
    expect(body.code).toBe("INVALID_FILE");
  });

  it("rejects magic bytes mismatch even when mime type is allowed", async () => {
    const file = createMagicBytesOnlyFile();
    const formData = createFormDataWithFile(file);

    mockEventFindUnique.mockResolvedValue({
      id: "evt-1",
      title: "Test Event",
    });

    const res = await runUpload(file, "evt-1", "ADMIN", { formData });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Format d'image non valide.");
    expect(body.code).toBe("INVALID_FILE");
  });

  it("uploads a valid png and persists coverImagePath", async () => {
    const eventId = "evt-1";
    const file = createValidPngFile();
    const formData = createFormDataWithFile(file);

    mockEventFindUnique.mockResolvedValue({
      id: eventId,
      title: "Test Event",
    });
    mockEventUpdate.mockResolvedValue({
      id: eventId,
      coverImagePath: `/events/${eventId}/cover.png`,
    });

    const res = await runUpload(file, eventId, "ADMIN", { formData });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.coverImagePath).toBe(`/events/${eventId}/cover.png`);
    expect(mockEventUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: eventId },
        data: { coverImagePath: `/events/${eventId}/cover.png` },
      })
    );
  });

  it("uploads a valid jpeg and persists coverImagePath", async () => {
    const eventId = "evt-1";
    const file = createValidJpegFile();
    const formData = createFormDataWithFile(file);

    mockEventFindUnique.mockResolvedValue({
      id: eventId,
      title: "Test Event",
    });
    mockEventUpdate.mockResolvedValue({
      id: eventId,
      coverImagePath: `/events/${eventId}/cover.jpg`,
    });

    const res = await runUpload(file, eventId, "ADMIN", { formData });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.coverImagePath).toBe(`/events/${eventId}/cover.jpg`);
  });

  it("uploads a valid webp and persists coverImagePath", async () => {
    const eventId = "evt-1";
    const file = createValidWebpFile();
    const formData = createFormDataWithFile(file);

    mockEventFindUnique.mockResolvedValue({
      id: eventId,
      title: "Test Event",
    });
    mockEventUpdate.mockResolvedValue({
      id: eventId,
      coverImagePath: `/events/${eventId}/cover.webp`,
    });

    const res = await runUpload(file, eventId, "ADMIN", { formData });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.coverImagePath).toBe(`/events/${eventId}/cover.webp`);
  });

  it("exports allowed mime types", () => {
    expect(COVER_ALLOWED_TYPES).toContain("image/jpeg");
    expect(COVER_ALLOWED_TYPES).toContain("image/png");
    expect(COVER_ALLOWED_TYPES).toContain("image/webp");
  });
});
