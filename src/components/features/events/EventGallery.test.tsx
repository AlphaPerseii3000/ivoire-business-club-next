import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EventGallery, GalleryPhoto } from "./EventGallery";

const mockPhotos: GalleryPhoto[] = [
  {
    id: "p1",
    eventId: "evt-1",
    uploadedById: "user-1",
    filePath: "/events/evt-1/gallery/p1.webp",
    caption: "Belle soirée de networking",
    createdAt: new Date("2026-07-01T20:00:00Z"),
    uploader: {
      id: "user-1",
      name: "Jean Dupont",
      image: "http://example.com/avatar.jpg",
    },
  },
  {
    id: "p2",
    eventId: "evt-1",
    uploadedById: "user-2",
    filePath: "/events/evt-1/gallery/p2.webp",
    caption: null,
    createdAt: new Date("2026-07-02T20:00:00Z"),
    uploader: {
      id: "user-2",
      name: "Marie Curie",
    },
  },
];

describe("EventGallery UI Component", () => {
  it("renders empty state message when photos array is empty", () => {
    render(<EventGallery eventId="evt-1" photos={[]} isPastEvent={true} />);

    expect(screen.getByText("Aucune photo partagée pour le moment")).toBeInTheDocument();
    expect(screen.getByText(/Soyez le premier à partager vos souvenirs/i)).toBeInTheDocument();
  });

  it("renders photos with captions and uploader info", () => {
    render(
      <EventGallery
        eventId="evt-1"
        photos={mockPhotos}
        currentUserId="user-1"
        currentUserRole="MEMBER"
      />
    );

    expect(screen.getByText("Galerie photos")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("« Belle soirée de networking »")).toBeInTheDocument();
    expect(screen.getByText("Jean Dupont")).toBeInTheDocument();
    expect(screen.getByText("Marie Curie")).toBeInTheDocument();
  });

  it("shows delete button for photo owner and ADMIN, hides for other members", () => {
    const { rerender } = render(
      <EventGallery
        eventId="evt-1"
        photos={mockPhotos}
        currentUserId="user-1"
        currentUserRole="MEMBER"
        readOnly={false}
      />
    );

    // p1 belongs to user-1, p2 belongs to user-2
    // User-1 is MEMBER -> can delete p1, cannot delete p2
    const deleteButtons = screen.getAllByTitle("Supprimer la photo");
    expect(deleteButtons.length).toBe(1);

    // Now render as ADMIN
    rerender(
      <EventGallery
        eventId="evt-1"
        photos={mockPhotos}
        currentUserId="user-1"
        currentUserRole="ADMIN"
        readOnly={false}
      />
    );

    // ADMIN can delete both photos
    expect(screen.getAllByTitle("Supprimer la photo").length).toBe(2);
  });

  it("hides upload and delete buttons when readOnly is true", () => {
    render(
      <EventGallery
        eventId="evt-1"
        photos={mockPhotos}
        currentUserId="user-1"
        currentUserRole="ADMIN"
        readOnly={true}
      />
    );

    expect(screen.queryByText("Ajouter des photos")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Supprimer la photo")).not.toBeInTheDocument();
  });

  it("opens lightbox modal when photo is clicked", () => {
    render(
      <EventGallery
        eventId="evt-1"
        photos={mockPhotos}
        currentUserId="user-1"
        currentUserRole="MEMBER"
      />
    );

    const caption = screen.getByText("« Belle soirée de networking »");
    fireEvent.click(caption.closest("div.group")!);

    // Lightbox modal should display full caption and uploader name
    expect(screen.getByText("Belle soirée de networking")).toBeInTheDocument();
    expect(screen.getByText(/Partagé par Jean Dupont/i)).toBeInTheDocument();
  });
});
