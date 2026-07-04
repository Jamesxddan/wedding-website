import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/components/webgl/PetalScene", () => ({ default: () => null }));
vi.mock("@/components/sections/Gallery", () => ({ default: () => <div>Gallery</div> }));
vi.mock("@/components/sections/Venue", () => ({ default: () => <div>Venue</div> }));
vi.mock("@/components/sections/Comments", () => ({ default: () => <div>Comments</div> }));
vi.mock("@/components/ui/Footer", () => ({ default: () => <footer>Footer</footer> }));
vi.mock("@giscus/react", () => ({ default: () => null }));
vi.mock("@/components/sections/YoutubeComments", () => ({ default: () => null }));

// Mock fetch for Gallery/Comments children
global.fetch = vi.fn().mockResolvedValue({ json: async () => ({ photos: [], configured: false }) });

describe("CabDialog", () => {
  it("renders to-venue mode with venue options", async () => {
    const { default: CabDialog } = await import("@/components/ui/CabDialog");
    render(<CabDialog mode="to-venue" onClose={() => {}} />);
    expect(screen.getByText("Ride to the Venue")).toBeInTheDocument();
    expect(screen.getByText("St Andrews Kirk")).toBeInTheDocument();
    expect(screen.getByText("BKN Auditorium")).toBeInTheDocument();
  });

  it("renders home mode with destination input", async () => {
    const { default: CabDialog } = await import("@/components/ui/CabDialog");
    render(<CabDialog mode="home" onClose={() => {}} />);
    expect(screen.getByText("Ride Home")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your address/i)).toBeInTheDocument();
  });

  it("calls onClose when close button clicked", async () => {
    const { default: CabDialog } = await import("@/components/ui/CabDialog");
    const onClose = vi.fn();
    render(<CabDialog mode="to-venue" onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when Escape pressed", async () => {
    const { default: CabDialog } = await import("@/components/ui/CabDialog");
    const onClose = vi.fn();
    render(<CabDialog mode="to-venue" onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("Uber link is disabled until destination entered in home mode", async () => {
    const { default: CabDialog } = await import("@/components/ui/CabDialog");
    render(<CabDialog mode="home" onClose={() => {}} />);
    const uber = screen.getByText(/book with uber/i).closest("a");
    expect(uber).toHaveAttribute("aria-disabled", "true");
  });

  it("Uber link becomes active after entering destination", async () => {
    const { default: CabDialog } = await import("@/components/ui/CabDialog");
    render(<CabDialog mode="home" onClose={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText(/enter your address/i), {
      target: { value: "Anna Nagar, Chennai" },
    });
    const uber = screen.getByText(/book with uber/i).closest("a");
    expect(uber).toHaveAttribute("aria-disabled", "false");
  });
});

describe("LiveStream", () => {
  it("renders nothing when url is empty", async () => {
    const { default: LiveStream } = await import("@/components/sections/LiveStream");
    const { container } = render(<LiveStream url="" label="Watch" channel="Kirk" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders YouTube iframe for youtube.com URLs", async () => {
    const { default: LiveStream } = await import("@/components/sections/LiveStream");
    render(
      <LiveStream
        url="https://www.youtube.com/watch?v=abc123"
        label="Watch the ceremony"
        channel="St Andrews Kirk"
      />
    );
    const iframe = screen.getByTitle("St Andrews Kirk");
    expect(iframe).toBeInTheDocument();
    expect((iframe as HTMLIFrameElement).src).toContain("abc123");
  });

  it("renders Watch Live button for non-YouTube URLs", async () => {
    const { default: LiveStream } = await import("@/components/sections/LiveStream");
    render(
      <LiveStream
        url="https://kirk.example.com/live"
        label="Watch the ceremony"
        channel="St Andrews Kirk"
      />
    );
    expect(screen.getByRole("link", { name: /watch live/i })).toBeInTheDocument();
  });
});

describe("WeddingDayBanner", () => {
  it("renders the wedding day heading", async () => {
    const { default: WeddingDayBanner } = await import("@/components/phases/WeddingDayBanner");
    render(<WeddingDayBanner guestName="James" />);
    expect(screen.getAllByText(/James & Sharon/).length).toBeGreaterThan(0);
    expect(screen.getByText(/getting married right now/i)).toBeInTheDocument();
  });

  it("renders personalised greeting", async () => {
    const { default: WeddingDayBanner } = await import("@/components/phases/WeddingDayBanner");
    render(<WeddingDayBanner guestName="Arun" />);
    expect(screen.getByText(/Dear Arun/)).toBeInTheDocument();
  });

  it("renders cab booking buttons", async () => {
    const { default: WeddingDayBanner } = await import("@/components/phases/WeddingDayBanner");
    render(<WeddingDayBanner guestName="James" />);
    expect(screen.getByRole("button", { name: /get a ride to the venue/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /book a ride home/i })).toBeInTheDocument();
  });

  it("opens cab dialog when button clicked", async () => {
    const { default: WeddingDayBanner } = await import("@/components/phases/WeddingDayBanner");
    render(<WeddingDayBanner guestName="James" />);
    fireEvent.click(screen.getByRole("button", { name: /get a ride to the venue/i }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
  });

  it("closes cab dialog on close", async () => {
    const { default: WeddingDayBanner } = await import("@/components/phases/WeddingDayBanner");
    render(<WeddingDayBanner guestName="James" />);
    fireEvent.click(screen.getByRole("button", { name: /get a ride to the venue/i }));
    await waitFor(() => screen.getByRole("dialog"));
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
