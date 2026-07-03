import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import AboutJames from "@/components/sections/AboutJames";
import AboutSharon from "@/components/sections/AboutSharon";
import Families from "@/components/sections/Families";

describe("AboutJames", () => {
  it("renders James's name", () => {
    render(<AboutJames />);
    expect(screen.getByText("James Daniel")).toBeInTheDocument();
  });

  it("renders The Groom label", () => {
    render(<AboutJames />);
    expect(screen.getByText(/the groom/i)).toBeInTheDocument();
  });
});

describe("AboutSharon", () => {
  it("renders Sharon's name", () => {
    render(<AboutSharon />);
    expect(screen.getByText("Sharon")).toBeInTheDocument();
  });

  it("renders The Bride label", () => {
    render(<AboutSharon />);
    expect(screen.getByText(/the bride/i)).toBeInTheDocument();
  });
});

describe("Families", () => {
  it("renders both family side headings", () => {
    render(<Families />);
    expect(screen.getByText("James's Family")).toBeInTheDocument();
    expect(screen.getByText("Sharon's Family")).toBeInTheDocument();
  });

  it("renders the section heading", () => {
    render(<Families />);
    expect(screen.getByText("The Families")).toBeInTheDocument();
  });

  it("renders family member roles", () => {
    render(<Families />);
    expect(screen.getByText("Father of the Groom")).toBeInTheDocument();
    expect(screen.getByText("Mother of the Bride")).toBeInTheDocument();
  });
});
