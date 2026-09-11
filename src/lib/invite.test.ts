import { isPlausibleInviteCode, normalizeInviteCode } from "./invite";

describe("invite code helpers", () => {
  it("normalizes case and spaces", () => {
    expect(normalizeInviteCode(" ab c123 ")).toBe("ABC123");
  });

  it("accepts generated six-to-twelve-character codes", () => {
    expect(isPlausibleInviteCode("A8F2K9Q4")).toBe(true);
    expect(isPlausibleInviteCode("ABCDEF123456")).toBe(true);
  });

  it("rejects short, long, and symbolic codes", () => {
    expect(isPlausibleInviteCode("ABC")).toBe(false);
    expect(isPlausibleInviteCode("ABCDEF1234567")).toBe(false);
    expect(isPlausibleInviteCode("ABC-123")).toBe(false);
  });
});
