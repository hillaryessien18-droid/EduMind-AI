import { formatPrice, initials } from "./format";

describe("format helpers", () => {
  it("formats prices", () => {
    expect(formatPrice("50.00")).toBe("$50");
    expect(formatPrice("19.99")).toBe("$19.99");
    expect(formatPrice("0")).toBe("Free");
  });
  it("builds initials", () => {
    expect(initials("Ubong Essien Eyo")).toBe("UE");
  });
});
