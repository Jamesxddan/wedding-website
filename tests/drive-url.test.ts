import { describe, it, expect } from "vitest";
import { extractDriveFolderId } from "@/lib/drive-url";

describe("extractDriveFolderId", () => {
  it("extracts the ID from a standard folder share link", () => {
    expect(extractDriveFolderId("https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz012345?usp=sharing"))
      .toBe("1AbCdEfGhIjKlMnOpQrStUvWxYz012345");
  });

  it("extracts the ID from a /u/0/folders/ link", () => {
    expect(extractDriveFolderId("https://drive.google.com/drive/u/0/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz012345"))
      .toBe("1AbCdEfGhIjKlMnOpQrStUvWxYz012345");
  });

  it("extracts the ID from an ?id= query param", () => {
    expect(extractDriveFolderId("https://drive.google.com/open?id=1AbCdEfGhIjKlMnOpQrStUvWxYz012345"))
      .toBe("1AbCdEfGhIjKlMnOpQrStUvWxYz012345");
  });

  it("accepts a bare folder ID", () => {
    expect(extractDriveFolderId("1AbCdEfGhIjKlMnOpQrStUvWxYz012345"))
      .toBe("1AbCdEfGhIjKlMnOpQrStUvWxYz012345");
  });

  it("returns null for empty or unrecognizable input", () => {
    expect(extractDriveFolderId("")).toBeNull();
    expect(extractDriveFolderId("not a link")).toBeNull();
    expect(extractDriveFolderId("https://example.com/random")).toBeNull();
  });
});
