// -------------------------------------------------
// QUERY SANITIZATION HELPERS
// -------------------------------------------------
// Guards public list endpoints against NoSQL operator
// injection (e.g. ?status[$ne]=available), parser-injected
// objects/arrays, and regex-ReDoS via user-supplied search.

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Return a plain trimmed string for scalar string input;
// undefined for objects/arrays/non-strings (blocks $op injection).
const str = (value) =>
  typeof value === "string" && value.trim()
    ? value.trim()
    : undefined;

// Return a regex-safe search string, or undefined.
const searchStr = (value) => {
  const s = str(value);
  return s ? escapeRegex(s) : undefined;
};

// Coerce to a lowercase scalar string (enum-friendly).
const strLower = (value) => {
  const s = str(value);
  return s ? s.toLowerCase() : undefined;
};

module.exports = { escapeRegex, str, searchStr, strLower };