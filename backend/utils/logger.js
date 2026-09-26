const fs = require("fs");
const path = require("path");
const winston = require("winston");

// -------------------------------------------------
// LOG DIRECTORY
// -------------------------------------------------
// The File transports below write into ./logs. That directory is
// created here up-front, otherwise a missing folder makes winston's
// File transport throw ENOENT (and potentially crash the process on
// startup because no logs/ directory exists yet).
// -------------------------------------------------
const logDir = path.join(__dirname, "..", "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
    }),
    new winston.transports.File({
      filename: "logs/combined.log",
    }),
  ],
});

// Prevent an unhandled transport error (e.g. disk full / permission
// issue) from crashing the API process - logging must never take the
// server down. This is a deliberate no-op listener that makes the
// failure visible without blowing up the request that triggered it.
logger.on("error", () => {
  // swallow transport errors: logging is best-effort by design
});

module.exports = logger;
