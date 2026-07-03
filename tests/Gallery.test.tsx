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

  it("renders photo grid when photos are returned", async () => {
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
    await waitFor(() => expect(screen.getByAltText("photo1.jpg")).toBeInTheDocument());
    expect(screen.getByAltText("photo2.jpg")).toBeInTheDocument();
  });

  it("opens lightbox when a photo is clicked", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        photos: [{ id: "1", name: "photo1.jpg", thumbnailUrl: "/t1.jpg", fullUrl: "/f1.jpg" }],
        configured: true,
      }),
    });
    render(<Gallery folder="engagement" />);
    await waitFor(() => screen.getByAltText("photo1.jpg"));
    fireEvent.click(screen.getByRole("button", { name: /view photo1/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes lightbox when close button is clicked", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        photos: [{ id: "1", name: "photo1.jpg", thumbnailUrl: "/t1.jpg", fullUrl: "/f1.jpg" }],
        configured: true,
      }),
    });
    render(<Gallery folder="engagement" />);
    await waitFor(() => screen.getByAltText("photo1.jpg"));
    fireEvent.click(screen.getByRole("button", { name: /view photo1/i }));
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

  it("fetches from the correct folder endpoint", async () => {
    fetchMock.mockResolvedValue({ json: async () => ({ photos: [], configured: false }) });
    render(<Gallery folder="wedding" />);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/drive-photos?folder=wedding");
    });
  });

  it("renders the section title", async () => {
    fetchMock.mockResolvedValue({ json: async () => ({ photos: [], configured: false }) });
    render(<Gallery folder="engagement" title="Engagement Gallery" />);
    expect(screen.getByText("Engagement Gallery")).toBeInTheDocument();
  });
});
