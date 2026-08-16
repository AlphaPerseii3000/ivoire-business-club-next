import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminMemberSearchInput } from "./admin-member-search-input";

const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams("");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/admin/members",
  useSearchParams: () => mockSearchParams,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} type={props.type || "search"} />
  ),
}));

describe("AdminMemberSearchInput", () => {
  it("renders with default value", () => {
    render(<AdminMemberSearchInput defaultValue="awa" />);
    expect(screen.getByDisplayValue("awa")).toBeInTheDocument();
  });

  it("does NOT call router.replace when only the page param changes (pagination is preserved)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    // L'utilisateur est sur la page 2 avec une recherche "awa".
    mockSearchParams = new URLSearchParams("q=awa&page=2");
    render(<AdminMemberSearchInput defaultValue="awa" />);

    // Simule un clic sur « Page suivante » : seul `page` change, `q` reste "awa".
    mockSearchParams = new URLSearchParams("q=awa&page=3");

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(mockReplace).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("updates q and deletes page param after debounce when the search value changes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    mockSearchParams = new URLSearchParams("page=2&tier=BOSS");
    render(<AdminMemberSearchInput defaultValue="" />);
    const input = screen.getByRole("searchbox");

    await user.type(input, "test");

    expect(mockReplace).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalled();
    });
    const lastCall = mockReplace.mock.calls[mockReplace.mock.calls.length - 1][0] as string;
    expect(lastCall).toMatch(/^\/admin\/members\?/);
    expect(lastCall).toContain("q=test");
    expect(lastCall).toContain("tier=BOSS");
    expect(lastCall).not.toContain("page=");

    vi.useRealTimers();
  });
});
