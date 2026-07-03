import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import OurStory from "@/components/sections/OurStory";

describe("OurStory", () => {
  it("renders the section heading", () => {
    render(<OurStory />);
    expect(screen.getByText("Our Story")).toBeInTheDocument();
  });

  it("renders all four milestone titles", () => {
    render(<OurStory />);
    expect(screen.getByText("First Meeting")).toBeInTheDocument();
    expect(screen.getByText("Growing Together")).toBeInTheDocument();
    expect(screen.getByText("The Proposal")).toBeInTheDocument();
    expect(screen.getByText("October 8th — Wedding Day")).toBeInTheDocument();
  });

  it("renders milestone years", () => {
    render(<OurStory />);
    expect(screen.getByText("2023")).toBeInTheDocument();
    expect(screen.getByText("2026")).toBeInTheDocument();
  });
});
