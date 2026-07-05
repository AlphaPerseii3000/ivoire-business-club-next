import { describe, it, expect } from "vitest";
import {
  getMediaStoragePath,
  getEventCoverDir,
  getEventCoverFilePath,
  getEventCoverRelativePath,
  getEventGalleryDir,
  getEventGalleryFilePath,
  getEventGalleryRelativePath,
} from "./media-path";
import path from "path";

describe("media-path helpers", () => {
  it("generates correct event gallery dir", () => {
    const dir = getEventGalleryDir("evt-123");
    expect(dir).toBe(path.join(getMediaStoragePath(), "events", "evt-123", "gallery"));
  });

  it("generates correct event gallery file path", () => {
    const filePath = getEventGalleryFilePath("evt-123", "photo1.webp");
    expect(filePath).toBe(path.join(getMediaStoragePath(), "events", "evt-123", "gallery", "photo1.webp"));
  });

  it("generates correct event gallery relative path", () => {
    const relPath = getEventGalleryRelativePath("evt-123", "photo1.webp");
    expect(relPath).toBe("/events/evt-123/gallery/photo1.webp");
  });
});
