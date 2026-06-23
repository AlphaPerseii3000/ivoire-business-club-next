import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import RichTextEditor from "./rich-text-editor";

describe("RichTextEditor", () => {
  it("renders the toolbar and editor area", async () => {
    const onChange = vi.fn();
    render(<RichTextEditor value="" onChange={onChange} data-testid="article-content-input" />);

    expect(screen.getByTestId("article-content-input")).toBeInTheDocument();
    expect(screen.getByTestId("markdown-bold-btn")).toBeInTheDocument();
    expect(screen.getByTestId("tiptap-italic-btn")).toBeInTheDocument();
  });

  it("calls onChange when typing into the editor", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(<RichTextEditor value="" onChange={onChange} data-testid="article-content-input" />);

    const proseMirror = container.querySelector(".ProseMirror");
    expect(proseMirror).toBeTruthy();

    await user.type(proseMirror as HTMLElement, "Hello");
    expect(onChange).toHaveBeenCalled();
  });
});
