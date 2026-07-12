import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminMemberSearchInput } from "./admin-member-search-input";

const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/admin/members",
  useSearchParams: () => new URLSearchParams("page=2&tier=BOSS"),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} type={props.type || "search"} />,
}));

describe("AdminMemberSearchInput", () => {
  it("renders with default value", () => {
    render(<AdminMemberSearchInput defaultValue="awa" />);
    expect(screen.getByDisplayValue("awa")).toBeInTheDocument();
  });

  it("updates q and deletes page param after debounce", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
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
    expect(lastCall).toMatch(/^\/admin\/?members\?/);
    expect(lastCall).toContain("q=test");
    expect(lastCall).toContain("tier=BOSS");
    expect(lastCall).not.toContain("page=");

    vi.useRealTimers();
  });
});
