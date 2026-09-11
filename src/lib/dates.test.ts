import { describeAnniversary, daysBetween, nextOccurrence, sortAnniversaries } from "./dates";
import type { Anniversary } from "../types";

function anniversary(overrides: Partial<Anniversary> = {}): Anniversary {
  return {
    id: "anniversary-1",
    space_id: "space-1",
    title: "在一起",
    anniversary_date: "2024-05-20",
    note: "",
    recurring: true,
    created_by: "user-1",
    created_at: "2024-05-20T00:00:00Z",
    updated_at: "2024-05-20T00:00:00Z",
    ...overrides,
  };
}

describe("anniversary date helpers", () => {
  it("calculates local calendar-day differences without timezone drift", () => {
    expect(daysBetween("2026-09-11", "2026-09-12")).toBe(1);
    expect(daysBetween("2026-09-11", "2026-09-11")).toBe(0);
    expect(daysBetween("2026-09-11", "2026-09-10")).toBe(-1);
  });

  it("moves a recurring anniversary to this year's remaining date", () => {
    expect(nextOccurrence("2024-05-20", true, new Date(2026, 8, 11))).toBe("2027-05-20");
    expect(nextOccurrence("2024-12-20", true, new Date(2026, 8, 11))).toBe("2026-12-20");
  });

  it("keeps one-time dates fixed", () => {
    expect(nextOccurrence("2024-05-20", false, new Date(2026, 8, 11))).toBe("2024-05-20");
  });

  it("describes and sorts the nearest recurring date first", () => {
    const near = describeAnniversary(anniversary({ anniversary_date: "2026-10-01" }), new Date(2026, 8, 11));
    const far = describeAnniversary(anniversary({ id: "2", anniversary_date: "2026-12-01" }), new Date(2026, 8, 11));
    expect(near.days).toBe(20);
    expect(far.days).toBe(81);

    const sorted = sortAnniversaries([far.anniversary, near.anniversary], new Date(2026, 8, 11));
    expect(sorted.map((item) => item.anniversary.id)).toEqual(["anniversary-1", "2"]);
  });
});
