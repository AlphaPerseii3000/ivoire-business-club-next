import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminMemberFilterSelect } from "./admin-member-filter-select";

const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const options = [
  { value: "", label: "Tous" },
  { value: "AFFRANCHI", label: "Affranchi" },
  { value: "BOSS", label: "Boss" },
];

describe("AdminMemberFilterSelect", () => {
  it("navigates with selected filter and deletes page param", async () => {
    const user = userEvent.setup();
    render(
      <AdminMemberFilterSelect
        value=""
        placeholder="Filtrer"
        options={options}
        ariaLabel="Filtrer par tier"
        q="awa"
        tier=""
        subscription=""
        status=""
        verification=""
        sort=""
        paramName="tier"
      />
    );

    await user.click(screen.getByRole("combobox"));
    const option = await screen.findByRole("option", { name: "Boss" });
    await user.click(option);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalled();
    });
    const lastCall = mockReplace.mock.calls[mockReplace.mock.calls.length - 1][0] as string;
    expect(lastCall).toContain("tier=BOSS");
    expect(lastCall).not.toContain("page=");
  });

  it("navigates with empty selection and deletes page param", async () => {
    const user = userEvent.setup();
    render(
      <AdminMemberFilterSelect
        value="BOSS"
        placeholder="Filtrer"
        options={options}
        ariaLabel="Filtrer par tier"
        q="awa"
        tier="BOSS"
        subscription=""
        status=""
        verification=""
        sort=""
        paramName="tier"
      />
    );

    await user.click(screen.getByRole("combobox"));
    const option = await screen.findByRole("option", { name: "Tous" });
    await user.click(option);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalled();
    });
    const lastCall = mockReplace.mock.calls[mockReplace.mock.calls.length - 1][0] as string;
    expect(lastCall).toContain("q=awa");
    expect(lastCall).not.toContain("tier=BOSS");
    expect(lastCall).not.toContain("page=");
  });
});
