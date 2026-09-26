const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(helmet({
  // Uploads (avatars, pet/community/lost-found images) must be embeddable
  // from the frontend origin (e.g. Live Server on 5502) as <img>, etc.
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(compression());
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5502').split(',').map(v => v.trim()).filter(Boolean);
// Allow local development origins including LAN access (phone on same Wi-Fi).
const isDevOrigin = function (origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (/^https?:\/\/localhost(?::\d+)?$/.test(origin)) return true;
  if (/^https?:\/\/127\.0\.0\.1(?::\d+)?$/.test(origin)) return true;
  // Private network ranges used by Live Server / Vite on a LAN.
  if (/^https?:\/\/(10|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(origin)) return true;
  return false;
};
app.use(cors({
  origin(origin, callback) {
    if (isDevOrigin(origin)) return callback(null, true);
    return callback(new Error('CORS origin not allowed'));
  },
  credentials: true
}));
// PetGPT /api/ai bodies are small (message/title/idempotencyKey/provider config).
// Bound them tightly BEFORE the app-wide 50mb parser so an oversized AI body is
// rejected at 413 and never parsed into memory. body-parser skips the later
// app-wide parse once req._body is set. (Phase 7 hardening.)
app.use('/api/ai', express.json({ limit: '32kb' }));
app.use('/api/ai', express.urlencoded({ extended: false, limit: '32kb' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/animal_planet')
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// Durable AI generation worker (Phase 4): in-process poller that picks
// up queued GenerationJobs and runs them independent of any HTTP request
// lifecycle. Mongoose buffers queries until the DB connection resolves.
require('./jobs/generation.worker').startWorker();

// Health Check (registered before the protected /api/health records router)
app.get('/api/status', (req, res) => {
  res.json({ status: 'OK', message: 'FamiPet API is running!' });
});

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/pets', require('./routes/pet.routes'));
app.use('/api/breeds', require('./routes/breed.routes'));
app.use('/api/adoptions', require('./routes/adoption.routes'));
app.use('/api/lost-found', require('./routes/lostFound.routes'));
app.use('/api/health', require('./routes/health.routes'));
app.use('/api/vaccinations', require('./routes/vaccination.routes'));
app.use("/api/favorites", require("./routes/favorite.routes"));
app.use('/api/veterinarians', require('./routes/veterinarian.routes'));
app.use('/api/appointments', require('./routes/appointment.routes'));
app.use('/api/community', require('./routes/community.routes'));
app.use('/api/ai', require('./routes/ai.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/reminders', require('./routes/reminder.routes'));
app.use('/api/admin', require('./routes/admin.routes'));


//home page 
app.get("/",(req,res)=>{
  res.status(200).json({
    success:true,
    message:"FamiPet backend is running successfully!"
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Graceful shutdown (Phase 7): a SIGINT/SIGTERM stops the HTTP server, lets the
// durable generation worker finish/abandon its in-flight tick cleanly, then
// closes MongoDB before exit. No job is cut off mid-provider-exchange; anything
// left in "processing" is recovered by the worker reaper on next boot.
function shutdown(signal) {
  console.log(`Received ${signal} — shutting down gracefully.`);
  server.close(() => {
    require("./jobs/generation.worker")
      .stopWorker()
      .then(() => mongoose.disconnect())
      .then(() => process.exit(0));
  });
  // If a long provider exchange never settles, stop waiting after 10s.
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// ---------------------------------------------------------
// FRONTEND FALLBACK LISTENER
// ---------------------------------------------------------
// Serve the static frontend on the CLIENT_URL port too, so emailed
// verify-email / reset-password links resolve even when the Live
// Server extension is not running. If Live Server already owns the
// port (EADDRINUSE) the backend quietly skips this fallback.
// ---------------------------------------------------------
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

function startFrontendFallback() {
  let clientPort = 5502;
  try {
    const clientUrl = new URL(process.env.CLIENT_URL || 'http://localhost:5502');
    clientPort = Number(clientUrl.port) || 5502;
  } catch (e) { /* keep default */ }

  if (clientPort === PORT) return;

  const frontendApp = express();
  frontendApp.use(compression());
  frontendApp.use(express.static(FRONTEND_DIR));

  frontendApp.get('*', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
  });

  const server = frontendApp.listen(clientPort, '0.0.0.0', () => {
    console.log(`🌐 Frontend available at http://localhost:${clientPort} (fallback)`);
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.log(`⏭ Port ${clientPort} is already in use (Live Server). Skipping frontend fallback.`);
    } else {
      console.error('❌ Frontend fallback error:', err.message);
    }
  });
}

startFrontendFallback();

module.exports = app;
