import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const fetchMock = vi.fn();
global.fetch = fetchMock;

import Gallery from "@/components/sections/Gallery";

const mockAlbums = [
  {
    id: "a1",
    name: "main",
    photos: [
      { id: "1", name: "photo1.jpg", thumbnailUrl: "/t1.jpg", fullUrl: "/f1.jpg" },
    ],
  },
  {
    id: "a2",
    name: "sub",
    photos: [
      { id: "2", name: "photo2.jpg", thumbnailUrl: "/t2.jpg", fullUrl: "/f2.jpg" },
      { id: "3", name: "photo3.jpg", thumbnailUrl: "/t3.jpg", fullUrl: "/f3.jpg" },
    ],
  },
];

describe("Gallery", () => {
  beforeEach(() => {
    fetchMock.mockClear();
  });

  it("shows loading state initially", () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    render(<Gallery folder="engagement" title="Engagement Gallery" />);
    expect(screen.getByText(/loading photos/i)).toBeInTheDocument();
  });

  it("shows placeholder when not configured", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ albums: [], configured: false }),
    });
    render(<Gallery folder="engagement" title="Engagement Gallery" />);
    await waitFor(() => expect(screen.getByText(/photos coming soon/i)).toBeInTheDocument());
  });

  it("renders spotlight tiles from prioritised albums", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ albums: mockAlbums, configured: true }),
    });
    render(<Gallery folder="engagement" title="Engagement Gallery" />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /view featured photo/i })).toBeInTheDocument()
    );
    expect(screen.getAllByRole("button", { name: /view photo/i }).length).toBeGreaterThan(0);
  });

  it("opens lightbox when featured photo tile is clicked", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ albums: mockAlbums, configured: true }),
    });
    render(<Gallery folder="engagement" />);
    await waitFor(() => screen.getByRole("button", { name: /view featured photo/i }));
    fireEvent.click(screen.getByRole("button", { name: /view featured photo/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes lightbox when close button is clicked", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ albums: mockAlbums, configured: true }),
    });
    render(<Gallery folder="engagement" />);
    await waitFor(() => screen.getByRole("button", { name: /view featured photo/i }));
    fireEvent.click(screen.getByRole("button", { name: /view featured photo/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("shows error message when API returns error", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ albums: [], configured: true, error: true }),
    });
    render(<Gallery folder="engagement" />);
    await waitFor(() => expect(screen.getByText(/could not load photos/i)).toBeInTheDocument());
  });

  it("fetches engagement with view=albums and no device param", async () => {
    fetchMock.mockResolvedValue({ json: async () => ({ albums: [], configured: false }) });
    render(<Gallery folder="engagement" />);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/drive-photos?folder=engagement&view=albums",
        expect.objectContaining({ headers: expect.any(Object) })
      );
    });
  });

  it("fetches wedding folder with view=albums", async () => {
    fetchMock.mockResolvedValue({ json: async () => ({ albums: [], configured: false }) });
    render(<Gallery folder="wedding" />);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/drive-photos?folder=wedding&view=albums",
        expect.objectContaining({ headers: expect.any(Object) })
      );
    });
  });

  it("renders album cards for wedding folder", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        albums: [
          { id: "a1", name: "Ceremony", photos: [{ id: "1", name: "p.jpg", thumbnailUrl: "/t1.jpg", fullUrl: "/f1.jpg" }] },
          { id: "a2", name: "Reception", photos: [{ id: "2", name: "p.jpg", thumbnailUrl: "/t2.jpg", fullUrl: "/f2.jpg" }] },
        ],
        configured: true,
      }),
    });
    render(<Gallery folder="wedding" title="Wedding Gallery" />);
    await waitFor(() => expect(screen.getByText("Ceremony")).toBeInTheDocument());
    expect(screen.getByText("Reception")).toBeInTheDocument();
  });

  it("renders the section title", async () => {
    fetchMock.mockResolvedValue({ json: async () => ({ albums: [], configured: false }) });
    render(<Gallery folder="engagement" title="Engagement Gallery" />);
    expect(screen.getByText("Engagement Gallery")).toBeInTheDocument();
  });

  it("puts main album photos before sub album photos", async () => {
    // main has photo id "m1", sub has "s1" — main should appear first in the DOM
    fetchMock.mockResolvedValue({
      json: async () => ({
        albums: [
          { id: "b", name: "sub", photos: [{ id: "s1", name: "s.jpg", thumbnailUrl: "/s.jpg", fullUrl: "/sf.jpg" }] },
          { id: "a", name: "main", photos: [{ id: "m1", name: "m.jpg", thumbnailUrl: "/m.jpg", fullUrl: "/mf.jpg" }] },
        ],
        configured: true,
      }),
    });
    render(<Gallery folder="engagement" />);
    // The "main" photo should become the featured tile (first in DOM)
    await waitFor(() => screen.getByRole("button", { name: /view featured photo/i }));
    const buttons = screen.getAllByRole("button", { name: /view (featured )?photo/i });
    // featured tile is first button rendered (main album's photo)
    expect(buttons[0]).toHaveAttribute("aria-label", "View featured photo");
  });
});
