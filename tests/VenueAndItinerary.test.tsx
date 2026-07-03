import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Venue from "@/components/sections/Venue";
import Itinerary from "@/components/sections/Itinerary";

describe("Venue", () => {
  it("renders the section heading", () => {
    render(<Venue />);
    expect(screen.getByText(/Venue & Details/i)).toBeInTheDocument();
  });

  it("renders both venue names", () => {
    render(<Venue />);
    expect(screen.getByText("St Andrews Kirk")).toBeInTheDocument();
    expect(screen.getByText("BKN Auditorium")).toBeInTheDocument();
  });

  it("renders Ceremony and Reception tags", () => {
    render(<Venue />);
    expect(screen.getByText("Ceremony")).toBeInTheDocument();
    expect(screen.getByText("Reception")).toBeInTheDocument();
  });

  it("renders Open in Maps links", () => {
    render(<Venue />);
    const mapLinks = screen.getAllByRole("link", { name: /open in maps/i });
    expect(mapLinks).toHaveLength(2);
    mapLinks.forEach((l) => expect(l).toHaveAttribute("target", "_blank"));
  });

  it("renders map iframes for each venue", () => {
    const { container } = render(<Venue />);
    const iframes = container.querySelectorAll("iframe");
    expect(iframes).toHaveLength(2);
  });
});

describe("Itinerary", () => {
  it("renders the itinerary heading", () => {
    render(<Itinerary />);
    expect(screen.getByText("Day Itinerary")).toBeInTheDocument();
  });

  it("renders ceremony and reception items", () => {
    render(<Itinerary />);
    expect(screen.getByText("Ceremony")).toBeInTheDocument();
    expect(screen.getByText("Reception")).toBeInTheDocument();
  });

  it("renders venue names for each itinerary item", () => {
    render(<Itinerary />);
    expect(screen.getByText("St Andrews Kirk")).toBeInTheDocument();
    expect(screen.getByText("BKN Auditorium")).toBeInTheDocument();
  });
});
