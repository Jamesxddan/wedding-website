import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const fetchMock = vi.fn();
global.fetch = fetchMock;

import Gallery from "@/components/sections/Gallery";

describe("Gallery", () => {
  beforeEach(() => {
    fetchMock.mockClear();
  });

  it("shows loading state initially", () => {
    fetchMock.mockReturnValue(new Promise(() => {})); // never resolves
    render(<Gallery folder="engagement" title="Engagement Gallery" />);
    expect(screen.getByText(/loading photos/i)).toBeInTheDocument();
  });

  it("shows placeholder when not configured", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ photos: [], configured: false }),
    });
    render(<Gallery folder="engagement" title="Engagement Gallery" />);
    await waitFor(() => expect(screen.getByText(/photos coming soon/i)).toBeInTheDocument());
  });

  it("renders flat photo tiles for engagement folder", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        photos: [
          { id: "1", name: "photo1.jpg", thumbnailUrl: "/t1.jpg", fullUrl: "/f1.jpg" },
          { id: "2", name: "photo2.jpg", thumbnailUrl: "/t2.jpg", fullUrl: "/f2.jpg" },
        ],
        configured: true,
      }),
    });
    render(<Gallery folder="engagement" title="Engagement Gallery" />);
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: /view photo/i })).toHaveLength(2)
    );
  });

  it("opens lightbox when a photo tile is clicked", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        photos: [
          { id: "1", name: "photo1.jpg", thumbnailUrl: "/t1.jpg", fullUrl: "/f1.jpg" },
        ],
        configured: true,
      }),
    });
    render(<Gallery folder="engagement" />);
    await waitFor(() => screen.getByRole("button", { name: /view photo/i }));
    fireEvent.click(screen.getByRole("button", { name: /view photo/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes lightbox when close button is clicked", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        photos: [
          { id: "1", name: "photo1.jpg", thumbnailUrl: "/t1.jpg", fullUrl: "/f1.jpg" },
        ],
        configured: true,
      }),
    });
    render(<Gallery folder="engagement" />);
    await waitFor(() => screen.getByRole("button", { name: /view photo/i }));
    fireEvent.click(screen.getByRole("button", { name: /view photo/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("shows error message when API returns error", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ photos: [], configured: true, error: true }),
    });
    render(<Gallery folder="engagement" />);
    await waitFor(() => expect(screen.getByText(/could not load photos/i)).toBeInTheDocument());
  });

  it("fetches engagement folder without view=albums", async () => {
    fetchMock.mockResolvedValue({ json: async () => ({ photos: [], configured: false }) });
    render(<Gallery folder="engagement" />);
    await waitFor(() => {
      const url: string = fetchMock.mock.calls[0][0];
      expect(url).toContain("/api/drive-photos?folder=engagement");
      expect(url).not.toContain("view=albums");
      expect(url).toMatch(/device=(mobile|desktop)/);
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
          { id: "a1", name: "Ceremony", photos: [{ id: "1", name: "photo1.jpg", thumbnailUrl: "/t1.jpg", fullUrl: "/f1.jpg" }] },
          { id: "a2", name: "Reception", photos: [{ id: "2", name: "photo2.jpg", thumbnailUrl: "/t2.jpg", fullUrl: "/f2.jpg" }] },
        ],
        configured: true,
      }),
    });
    render(<Gallery folder="wedding" title="Wedding Gallery" />);
    await waitFor(() => expect(screen.getByText("Ceremony")).toBeInTheDocument());
    expect(screen.getByText("Reception")).toBeInTheDocument();
  });

  it("renders the section title", async () => {
    fetchMock.mockResolvedValue({ json: async () => ({ photos: [], configured: false }) });
    render(<Gallery folder="engagement" title="Engagement Gallery" />);
    expect(screen.getByText("Engagement Gallery")).toBeInTheDocument();
  });
});
