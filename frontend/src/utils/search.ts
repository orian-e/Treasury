// Shared matching helpers for the client-side search boxes.
// Kept out of the components so the edge cases (accents, multi-word queries)
// can be tested directly.

// Combining diacritical marks. Written as escapes because the characters
// themselves are invisible in source, and as an explicit range rather than
// \p{Diacritic} because that needs the unicode regex flag, which this
// project's es5 compile target disallows.
const COMBINING_MARKS = /[\u0300-\u036f]/g;

// Strips accents so "fernandez" matches "Fernández".
// Hebrew and emoji pass through NFD unchanged.
export const normalizeForSearch = (value: string): string =>
  value.normalize("NFD").replace(COMBINING_MARKS, "").toLowerCase();

// Splits a raw query into normalized tokens. An empty or whitespace-only
// query yields no tokens, which callers treat as "match everything".
export const tokenizeQuery = (query: string): string[] =>
  normalizeForSearch(query).split(/\s+/).filter(Boolean);

// Every token must appear in at least one field (AND across tokens,
// OR across fields), so "alice groceries" matches an expense whose
// description and payer each supply one of the words.
export const matchesQuery = (
  fields: Array<string | undefined | null>,
  query: string
): boolean => {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return true;

  const haystack = fields
    .filter((field): field is string => !!field)
    .map(normalizeForSearch);

  return tokens.every((token) =>
    haystack.some((field) => field.includes(token))
  );
};
