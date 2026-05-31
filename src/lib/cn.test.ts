import { describe, it, expect } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("joins multiple class names with a space", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("ignores falsy inputs (undefined, null, false)", () => {
    expect(cn("a", undefined, null, false, "b")).toBe("a b");
  });

  it("resolves conflicting Tailwind classes via tailwind-merge (last wins)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
