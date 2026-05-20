import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TagChips } from "./tag-chips";
import { TagInput } from "./tag-input";

describe("TagChips", () => {
  it("renders French labels and filter links", () => {
    render(<TagChips tags={[{ category: "SECTEUR", value: "tech" }, { category: "LOCALISATION", value: "cocody" }]} />);

    expect(screen.getByRole("link", { name: "Tech" })).toHaveAttribute("href", "/dashboard/opportunities?tagCategory=SECTEUR&tagValue=tech");
    expect(screen.getByRole("link", { name: "Cocody" })).toHaveAttribute("href", "/dashboard/opportunities?tagCategory=LOCALISATION&tagValue=cocody");
  });

  it("removes a tag with an accessible button", async () => {
    const onRemove = vi.fn();
    render(<TagChips tags={[{ category: "SECTEUR", value: "tech" }]} interactive={false} removable onRemove={onRemove} />);

    await userEvent.click(screen.getByRole("button", { name: "Retirer le tag Tech" }));

    expect(onRemove).toHaveBeenCalledWith({ category: "SECTEUR", value: "tech" });
  });
});

describe("TagInput", () => {
  it("shows selected tags and deduplicates when adding", async () => {
    const onChange = vi.fn();
    render(<TagInput value={[{ category: "SECTEUR", value: "tech" }]} onChange={onChange} />);

    expect(screen.getByText("Tech")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retirer le tag Tech" }));

    expect(onChange).toHaveBeenCalledWith([]);
  });
});
