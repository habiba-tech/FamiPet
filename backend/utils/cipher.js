const crypto = require("crypto");

// =========================================================
// Provider API-key encryption (Phase 3)
// ---------------------------------------------------------
// Application-level AES-256-GCM. The 32-byte key is derived
// from the PETGPT_ENCRYPTION_KEY env secret (any string).
// Stored shape: "<iv>:<authTag>:<ciphertext>" (base64 parts).
// Never logs, never embeds the secret in messages, and fails
// closed on a missing/wrong key — plaintext is never written.
// =========================================================

function encryptionKey() {
  const secret = process.env.PETGPT_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("PETGPT_ENCRYPTION_KEY is not configured");
  }
  return crypto.createHash("sha256").update(String(secret)).digest();
}

function encryptSecret(plaintext) {
  if (!plaintext) {
    throw new Error("Cannot encrypt an empty secret");
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

function decryptSecret(stored) {
  if (!stored || typeof stored !== "string") {
    throw new Error("Invalid stored secret");
  }
  const parts = stored.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid stored secret");
  }
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(parts[0], "base64"));
    decipher.setAuthTag(Buffer.from(parts[1], "base64"));
    return Buffer.concat([decipher.update(Buffer.from(parts[2], "base64")), decipher.final()]).toString("utf8");
  } catch (error) {
    throw new Error("Failed to decrypt stored secret");
  }
}

module.exports = { encryptSecret, decryptSecret };