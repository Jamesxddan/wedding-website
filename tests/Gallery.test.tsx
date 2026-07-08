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

  it("renders album cards when albums are returned", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        albums: [
          { id: "a1", name: "Candid", photos: [{ id: "1", name: "photo1.jpg", thumbnailUrl: "/t1.jpg", fullUrl: "/f1.jpg" }] },
          { id: "a2", name: "Trad", photos: [{ id: "2", name: "photo2.jpg", thumbnailUrl: "/t2.jpg", fullUrl: "/f2.jpg" }] },
        ],
        configured: true,
      }),
    });
    render(<Gallery folder="engagement" title="Engagement Gallery" />);
    await waitFor(() => expect(screen.getByText("Candid")).toBeInTheDocument());
    expect(screen.getByText("Trad")).toBeInTheDocument();
  });

  it("opens photo grid when an album is clicked", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        albums: [
          { id: "a1", name: "Candid", photos: [{ id: "1", name: "photo1.jpg", thumbnailUrl: "/t1.jpg", fullUrl: "/f1.jpg" }] },
        ],
        configured: true,
      }),
    });
    render(<Gallery folder="engagement" />);
    await waitFor(() => screen.getByText("Candid"));
    fireEvent.click(screen.getByRole("button", { name: /open Candid album/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /view photo/i })).toBeInTheDocument());
  });

  it("opens and closes lightbox", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        albums: [
          { id: "a1", name: "Candid", photos: [{ id: "1", name: "photo1.jpg", thumbnailUrl: "/t1.jpg", fullUrl: "/f1.jpg" }] },
        ],
        configured: true,
      }),
    });
    render(<Gallery folder="engagement" />);
    await waitFor(() => screen.getByText("Candid"));
    fireEvent.click(screen.getByRole("button", { name: /open Candid album/i }));
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

  it("fetches from the correct folder endpoint", async () => {
    fetchMock.mockResolvedValue({ json: async () => ({ albums: [], configured: false }) });
    render(<Gallery folder="wedding" />);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/drive-photos?folder=wedding&view=albums",
        expect.objectContaining({ headers: expect.any(Object) })
      );
    });
  });

  it("renders the section title", async () => {
    fetchMock.mockResolvedValue({ json: async () => ({ photos: [], configured: false }) });
    render(<Gallery folder="engagement" title="Engagement Gallery" />);
    expect(screen.getByText("Engagement Gallery")).toBeInTheDocument();
  });
});
