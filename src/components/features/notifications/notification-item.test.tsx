import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationItem } from "./notification-item";

const unreadNotification = {
  id: "notif-1",
  title: "Awa est intéressé(e) par votre deal Terrain à Cocody",
  body: "Awa est intéressé(e) par votre deal Terrain à Cocody",
  href: "/dashboard/opportunities/opp-1?highlight=interests",
  readAt: null,
  createdAt: new Date("2026-05-20T00:00:00.000Z"),
};

describe("NotificationItem", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("links to the notification target and marks unread notifications as read on click", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    render(<NotificationItem notification={unreadNotification} />);

    const link = screen.getByRole("link", { name: /Awa est intéressé\(e\)/ });
    expect(link).toHaveAttribute("href", "/dashboard/opportunities/opp-1?highlight=interests");

    await userEvent.click(link);

    expect(fetchMock).toHaveBeenCalledWith("/api/notifications/notif-1/read", { method: "POST" });
  });

  it("does not call the read API for already read notifications", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<NotificationItem notification={{ ...unreadNotification, readAt: new Date("2026-05-20T01:00:00.000Z") }} />);
    await userEvent.click(screen.getByRole("link", { name: /Awa est intéressé\(e\)/ }));

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
