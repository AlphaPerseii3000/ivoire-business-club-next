import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEventCoverFilePath } from "@/lib/media-path";
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
  getEventCoverFilePath: vi.fn((eventId: string, ext: string) =>
    path.join(process.env.MEDIA_STORAGE_PATH || "", "events", eventId, `cover${ext}`)
  ),
}));

describe("GET /api/media/events/[eventId]/cover", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ibc-media-test-"));
    process.env.MEDIA_STORAGE_PATH = tmpDir;
    mockAuth.mockResolvedValue(null);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  async function runGet(eventId: string) {
    const req = new NextRequest(`http://localhost:3000/api/media/events/${eventId}/cover`, {
      method: "GET",
    });
    const params = Promise.resolve({ eventId });
    return GET(req, { params });
  }

  it("returns 404 when event does not exist", async () => {
    (prisma.event.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await runGet("evt-missing");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Couverture introuvable.");
  });

  it("returns 404 when event has no coverImagePath", async () => {
    (prisma.event.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "evt-1",
      visibility: "PUBLIC",
      coverImagePath: null,
    });

    const res = await runGet("evt-1");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Couverture introuvable.");
  });

  it("returns 404 for PRIVATE event when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    (prisma.event.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "evt-1",
      visibility: "PRIVATE",
      coverImagePath: "/events/evt-1/cover.jpg",
    });

    const dir = path.join(tmpDir, "events", "evt-1");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "cover.jpg"), new Uint8Array([0xff, 0xd8, 0xff]));

    const res = await runGet("evt-1");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Couverture introuvable.");
  });

  it("returns 200 for PRIVATE event when authenticated", async () => {
    mockAuth.mockResolvedValue({ user: { id: "member-1" } });
    (prisma.event.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "evt-1",
      visibility: "PRIVATE",
      coverImagePath: "/events/evt-1/cover.jpg",
    });

    const dir = path.join(tmpDir, "events", "evt-1");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "cover.jpg"), new Uint8Array([0xff, 0xd8, 0xff]));

    const res = await runGet("evt-1");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("returns 404 when cover file is missing", async () => {
    (prisma.event.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "evt-1",
      visibility: "PUBLIC",
      coverImagePath: "/events/evt-1/cover.jpg",
    });

    const res = await runGet("evt-1");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Couverture introuvable.");
  });

  it("returns 200 with correct content type and cache headers", async () => {
    const eventId = "evt-1";
    const dir = path.join(tmpDir, "events", eventId);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "cover.jpg"), new Uint8Array([0xff, 0xd8, 0xff]));

    (prisma.event.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: eventId,
      visibility: "PUBLIC",
      coverImagePath: `/events/${eventId}/cover.jpg`,
    });

    const res = await runGet(eventId);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
  });

  it("uses getEventCoverFilePath to resolve the file", async () => {
    const eventId = "evt-1";
    (prisma.event.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: eventId,
      visibility: "PUBLIC",
      coverImagePath: "/events/evt-1/cover.png",
    });

    await runGet(eventId);
    expect(getEventCoverFilePath).toHaveBeenCalledWith(eventId, ".png");
  });
});
