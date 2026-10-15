// =====================================================
// ENVIRONMENT VALIDATOR (zod)
// =====================================================
// Startup check that makes a broken environment visible instead of letting
// the API half-run:
//   * REQUIRED vars missing (MONGODB_URI, JWT_SECRET) -> hard error, exit.
//   * Wrongly-typed vars and half-configured optional feature groups
//     (Email / PetGPT / VAPID push / Cloudinary) -> warnings naming exactly
//     what is missing, at boot, so a developer knows without guessing.
//
// Pure functions (analyzeEnv) so the test suite can exercise them without
// triggering process.exit. validateEnvAndExit() is called once from
// server.js before anything connects.
// =====================================================
const { z } = require("zod");
const logger = require("../utils/logger");

// The deployment model is documented in root .env.example: for the normal
// `docker compose up` stack every value lives in the gitignored root .env;
// when running the API alone it lives in the gitignored backend/.env.
const REQUIRED = new Set(["MONGODB_URI", "JWT_SECRET"]);

const httpUrl = () => z.string().min(1).refine((v) => v.startsWith("http://") || v.startsWith("https://"), {
  message: "must be an absolute http(s) origin",
});

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  JWT_EXPIRE: z.string().min(1).default("30d"),

  CLIENT_URL: z.string().optional(),

  // Public origin generated QR codes (Digital Pet ID) must point at. Kept
  // separate from CLIENT_URL (a CORS allow-list that may start with localhost).
  PUBLIC_APP_URL: httpUrl().optional(),

  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(1),

  // ---- optional feature groups (all-or-nothing, see below) ----
  EMAIL_SERVICE: z.string().optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASS: z.string().optional(),

  PETGPT_OPENAI_BASE_URL: httpUrl().optional(),
  PETGPT_OPENAI_API_KEY: z.string().optional(),
  PETGPT_OPENAI_MODEL: z.string().optional(),

  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

// Optional services are all-or-nothing: partial configuration silently
// disables a service in a confusing half-way state, so call it out.
const FEATURE_GROUPS = [
  {
    name: "Email transport",
    vars: ["EMAIL_USER", "EMAIL_PASS"],
    note: "registration and password-reset fail with a clear error until both are set",
  },
  {
    name: "PetGPT AI provider",
    vars: ["PETGPT_OPENAI_BASE_URL", "PETGPT_OPENAI_API_KEY", "PETGPT_OPENAI_MODEL"],
    note: "PetGPT stays disabled until all three are set",
  },
  {
    name: "Browser push (VAPID)",
    vars: ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"],
    note: "push notifications stay off until all three are set",
  },
  {
    name: "Cloudinary image hosting",
    vars: ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"],
    note: "uploads fall back to local storage until all three are set",
  },
];

const isSet = (env, key) => String(env[key] ?? "").trim().length > 0;

const allOrNothing = (env, { name, vars, note }) => {
  const set = vars.filter((v) => isSet(env, v));
  if (set.length === 0) return; // service simply disabled - expected/optional
  if (set.length < vars.length) {
    const missing = vars.filter((v) => !isSet(env, v)).join(", ");
    return `${name} partially configured (missing: ${missing}) - ${note}`;
  }
  return null;
};

function analyzeEnv(env = process.env) {
  const warnings = [];
  const errors = [];

  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      const msg = `${key}: ${issue.message}`;
      // Only MONGODB_URI / JWT_SECRET are hard requirements; a wrong value on
      // anything else (bad PORT, invalid URL) is a loud warning, not a crash.
      if (REQUIRED.has(key)) errors.push(msg);
      else warnings.push(msg);
    }
  }

  if (env.CLIENT_URL) {
    const origins = String(env.CLIENT_URL).split(",").map((v) => v.trim()).filter(Boolean);
    const bad = origins.filter((o) => !/^https?:\/\//.test(o));
    if (origins.length === 0 || bad.length) {
      warnings.push(
        `CLIENT_URL should be one or more absolute origins, comma-separated ` +
        `(e.g. http://localhost:8080,https://app.example.com) - got "${env.CLIENT_URL}". ` +
        `Emailed verify/reset links and the CORS allow-list rely on it.`
      );
    }
  }

  // A production deployment without PUBLIC_APP_URL generates Pet ID QR codes
  // from CLIENT_URL's first entry - normally http://localhost - which is
  // useless off the deployment host. Warn loudly rather than silently ship
  // unscannable codes.
  if (String(env.NODE_ENV || "").trim() === "production" && !isSet(env, "PUBLIC_APP_URL")) {
    warnings.push(
      `PUBLIC_APP_URL is unset in production: generated Pet ID QR codes fall back to ` +
      `CLIENT_URL's first origin (often http://localhost) and will not scan off the ` +
      `deployment host. Set PUBLIC_APP_URL to the public hostname users browse to.`
    );
  }

  for (const group of FEATURE_GROUPS) {
    const issue = allOrNothing(env, group);
    if (issue) warnings.push(issue);
  }

  return { errors, warnings };
}

// Called once from server.js, before any connections open. Logs every
// problem, then exits when a hard requirement is missing so a broken
// environment fails fast instead of serving a half-working API.
function validateEnvAndExit() {
  const { errors, warnings } = analyzeEnv(process.env);

  for (const warning of warnings) logger.warn(`ENV: ${warning}`);
  if (errors.length === 0) return true;

  for (const error of errors) logger.error(`ENV: ${error}`);
  logger.error(
    `ENV: ${errors.length} required variable(s) missing. Define them in the ` +
    `root .env (docker compose deployment) or backend/.env (standalone run), ` +
    `then start the backend again. See .env.example for the contract.`
  );
  process.exit(1);
}

module.exports = { analyzeEnv, validateEnvAndExit };