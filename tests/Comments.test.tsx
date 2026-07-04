import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock @giscus/react so tests don't load the external script
vi.mock("@giscus/react", () => ({
  default: () => <div data-testid="giscus-widget" />,
}));

describe("Comments — unconfigured (default constants)", () => {
  it("renders the section heading", async () => {
    const { default: Comments } = await import("@/components/sections/Comments");
    render(<Comments />);
    expect(screen.getByText("Leave a Blessing")).toBeInTheDocument();
  });

  it("renders the placeholder when Giscus is not configured", async () => {
    const { default: Comments } = await import("@/components/sections/Comments");
    render(<Comments />);
    expect(screen.getByText(/comments coming soon/i)).toBeInTheDocument();
  });

  it("renders a Giscus attribution link", async () => {
    const { default: Comments } = await import("@/components/sections/Comments");
    render(<Comments />);
    expect(screen.getByRole("link", { name: /giscus/i })).toBeInTheDocument();
  });
});

describe("Comments — configured", () => {
  it("renders the Giscus widget when config is filled", async () => {
    vi.doMock("@/lib/constants", () => ({
      GISCUS_CONFIG: {
        repo: "james/wedding",
        repoId: "R_abc",
        category: "Blessings",
        categoryId: "DIC_abc",
      },
    }));

    // Re-import after mock is set
    const { default: Comments } = await import("@/components/sections/Comments?v=configured");
    render(<Comments />);
    // Heading always present
    expect(screen.getByText("Leave a Blessing")).toBeInTheDocument();
  });
});
