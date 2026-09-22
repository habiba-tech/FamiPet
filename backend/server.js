const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const logger = require('./utils/logger');

// Map multer errors (no HTTP status attached) to a client-safe message.
const multerErrorMessage = (err) => {
  if (!err || err.name !== 'MulterError') return null;
  if (err.code === 'LIMIT_FILE_SIZE') {
    return 'File too large. Maximum allowed size is 5MB.';
  }
  return err.message || 'File upload failed.';
};

// Ensure the local uploads directory exists before multer writes to it.
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

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
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Request logging with URL redaction: reset / verify tokens are
// passed in the URL path as long hex strings and must never be
// written to the logs.
morgan.token('url', (req) =>
  String(req.originalUrl || req.url || '').replace(/[a-f0-9]{32,}/gi, '[REDACTED]')
);
app.use(morgan('dev'));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/animal_planet')
  .then(() => logger.info('✅ MongoDB Connected'))
  .catch(err => logger.error('❌ MongoDB Error:', err));

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

// Error Handler — centralized, production-safe. Logs the full error
// server-side but never leaks stack traces / internal details to the
// client: only 4xx messages (which we author ourselves) are echoed.
app.use((err, req, res, _next) => {
  logger.error(err.stack || err.message || err);

  // Multer file-upload errors carry a code but no HTTP status.
  const multerMessage = multerErrorMessage(err);

  if (multerMessage) {
    return res.status(413).json({
      success: false,
      message: multerMessage,
    });
  }

  const status = err.status || 500;

  const message =
    status >= 400 && status < 500 && err.message
      ? err.message
      : 'Internal Server Error';

  res.status(status).json({
    success: false,
    message,
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${PORT}`);
});

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
  } catch { /* keep default */ }

  if (clientPort === PORT) return;

  const frontendApp = express();
  frontendApp.use(compression());
  frontendApp.use(express.static(FRONTEND_DIR));

  frontendApp.get('*', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
  });

  const server = frontendApp.listen(clientPort, '0.0.0.0', () => {
    logger.info(`🌐 Frontend available at http://localhost:${clientPort} (fallback)`);
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      logger.info(`⏭ Port ${clientPort} is already in use (Live Server). Skipping frontend fallback.`);
    } else {
      logger.error('❌ Frontend fallback error:', err.message);
    }
  });
}

startFrontendFallback();

module.exports = app;
