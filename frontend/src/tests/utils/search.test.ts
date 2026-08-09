import {
  matchesQuery,
  normalizeForSearch,
  tokenizeQuery,
} from "../../utils/search";

describe("normalizeForSearch", () => {
  it("strips accents so unaccented typing still matches", () => {
    expect(normalizeForSearch("Clara Fernández")).toBe("clara fernandez");
  });

  it("lowercases", () => {
    expect(normalizeForSearch("IKEA")).toBe("ikea");
  });

  it("leaves Hebrew and emoji intact", () => {
    expect(normalizeForSearch("ארוחת ערב")).toBe("ארוחת ערב");
    expect(normalizeForSearch("Flatmates 🏠")).toBe("flatmates 🏠");
  });
});

describe("tokenizeQuery", () => {
  it("splits on whitespace and drops empties", () => {
    expect(tokenizeQuery("  alice   groceries ")).toEqual([
      "alice",
      "groceries",
    ]);
  });

  it("returns no tokens for blank queries", () => {
    expect(tokenizeQuery("")).toEqual([]);
    expect(tokenizeQuery("   ")).toEqual([]);
  });
});

describe("matchesQuery", () => {
  const expenseFields = ["Weekly groceries", "Alice Martin", "Clara Fernández"];

  it("matches everything when the query is blank", () => {
    expect(matchesQuery(expenseFields, "")).toBe(true);
    expect(matchesQuery(expenseFields, "   ")).toBe(true);
  });

  it("ignores a trailing space rather than emptying the results", () => {
    expect(matchesQuery(expenseFields, "groceries ")).toBe(true);
  });

  it("is case and accent insensitive together", () => {
    expect(matchesQuery(expenseFields, "FERNANDEZ")).toBe(true);
    expect(matchesQuery(expenseFields, "fernandez")).toBe(true);
  });

  it("matches Hebrew substrings", () => {
    expect(
      matchesQuery(["ארוחת ערב משותפת — Shared dinner"], "ארוחת")
    ).toBe(true);
  });

  it("requires every token, but they may come from different fields", () => {
    expect(matchesQuery(expenseFields, "alice groceries")).toBe(true);
    expect(matchesQuery(expenseFields, "alice ikea")).toBe(false);
  });

  it("skips undefined and null fields without throwing", () => {
    expect(matchesQuery(["Trip Group", undefined, null], "trip")).toBe(true);
    expect(matchesQuery([undefined, null], "trip")).toBe(false);
  });
});
