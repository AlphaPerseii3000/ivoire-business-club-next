import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEventGalleryFilePath } from "@/lib/media-path";
import fs from "fs/promises";
import path from "path";
import os from "os";

const mockAuth = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/media-path", () => ({
  getEventGalleryFilePath: vi.fn((eventId: string, filename: string) =>
    path.join(process.env.MEDIA_STORAGE_PATH || "", "events", eventId, "gallery", filename)
  ),
}));

describe("GET /api/media/events/[eventId]/gallery/[filename]", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ibc-gallery-media-test-"));
    process.env.MEDIA_STORAGE_PATH = tmpDir;
    mockAuth.mockResolvedValue(null);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  async function runGet(eventId: string, filename: string) {
    const req = new NextRequest(`http://localhost:3000/api/media/events/${eventId}/gallery/${filename}`, {
      method: "GET",
    });
    const params = Promise.resolve({ eventId, filename });
    return GET(req, { params });
  }

  it("returns 404 when event does not exist", async () => {
    (prisma.event.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await runGet("evt-missing", "pic1.jpg");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Fichier introuvable.");
  });

  it("returns 404 for PRIVATE event when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    (prisma.event.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "evt-1",
      visibility: "PRIVATE",
    });

    const dir = path.join(tmpDir, "events", "evt-1", "gallery");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "pic1.jpg"), new Uint8Array([0xff, 0xd8, 0xff]));

    const res = await runGet("evt-1", "pic1.jpg");
    expect(res.status).toBe(404);
  });

  it("returns 200 for PRIVATE event when authenticated", async () => {
    mockAuth.mockResolvedValue({ user: { id: "member-1" } });
    (prisma.event.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "evt-1",
      visibility: "PRIVATE",
    });

    const dir = path.join(tmpDir, "events", "evt-1", "gallery");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "pic1.jpg"), new Uint8Array([0xff, 0xd8, 0xff]));

    const res = await runGet("evt-1", "pic1.jpg");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("returns 404 when file does not exist on disk", async () => {
    (prisma.event.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "evt-1",
      visibility: "PUBLIC",
    });

    const res = await runGet("evt-1", "missing.webp");
    expect(res.status).toBe(404);
  });

  it("returns 200 with correct content type and cache headers for PUBLIC event", async () => {
    const eventId = "evt-1";
    const filename = "photo1.webp";
    const dir = path.join(tmpDir, "events", eventId, "gallery");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, filename), new Uint8Array([0x52, 0x49, 0x46, 0x46]));

    (prisma.event.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: eventId,
      visibility: "PUBLIC",
    });

    const res = await runGet(eventId, filename);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/webp");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
  });

  it("rejects path traversal attempt with 404", async () => {
    (prisma.event.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "evt-1",
      visibility: "PUBLIC",
    });

    const res = await runGet("evt-1", "../secret.txt");
    expect(res.status).toBe(404);
  });
});
