import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BusinessAbidjanPage, { metadata } from "./page";

describe("Business à Abidjan Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("has correct SEO metadata", () => {
    expect(metadata.title).toBe("Business à Abidjan | Ivoire Business Club");
    expect(metadata.description).toContain("business à Abidjan");
    expect(metadata.description).toContain("opportunités");
  });

  it("renders h1 with target keywords", () => {
    render(<BusinessAbidjanPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Business à Abidjan");
  });

  it("renders at least 300 words of French content", () => {
    render(<BusinessAbidjanPage />);
    const bodyText = document.body.textContent || "";
    const wordCount = bodyText.trim().split(/\s+/).length;
    expect(wordCount).toBeGreaterThanOrEqual(300);
  });

  it("renders multiple h2 sections and internal CTAs", () => {
    render(<BusinessAbidjanPage />);
    const h2s = screen.getAllByRole("heading", { level: 2 });
    expect(h2s.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("link", { name: /Découvrir les opportunités/i })).toHaveAttribute("href", "/opportunities");
    expect(screen.getByRole("link", { name: /S\u0027inscrire au club/i })).toHaveAttribute("href", "/auth/signup");
  });
});
