// =========================================================
// Digital Pet ID QR payload
// ---------------------------------------------------------
// The QR encodes a STABLE, human-facing destination URL
// (public Pet Details page) instead of a raw JSON blob, so a
// camera scan opens readable pet info rather than `[object
// Object]`.
//
// The base origin is the deployment's PUBLIC_APP_URL — the hostname
// users actually browse to (root .env -> docker-compose -> backend
// container). It is deliberately SEPARATE from CLIENT_URL: that is a
// CORS allow-list whose first entry is legitimately http://localhost
// for local development, so deriving the QR host from it made
// production QRs open localhost. PUBLIC_APP_URL unset falls back to
// CLIENT_URL (then a localhost default) so standalone/local dev keeps
// working unchanged.
// =========================================================

const GENERIC_FALLBACK_BASE = "http://localhost:8080";

// PUBLIC_APP_URL is a single origin; CLIENT_URL may be a comma-separated
// allow-list, so take its first entry. A single QR destination needs
// exactly one origin.
function petQrBaseUrl() {
  const configured = process.env.PUBLIC_APP_URL || process.env.CLIENT_URL || GENERIC_FALLBACK_BASE;
  return String(configured)
    .split(",")[0]
    .trim()
    .replace(/\/+$/, "");
}

// The payload string encoded into the QR image.
function petQrPayloadUrl(petUid) {
  return `${petQrBaseUrl()}/pet/${encodeURIComponent(petUid)}`;
}

module.exports = { petQrBaseUrl, petQrPayloadUrl };