require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const morgan = require('morgan');
const path = require('path');

const RequestLog = require('./models/RequestLog');

const PORT = process.env.PORT || 3001;
const ATTACKER_PORT = process.env.ATTACKER_PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/referrer_demo';
let FIX_ACTIVE = String(process.env.FIX_ACTIVE).toLowerCase() === 'true';

async function connectMongo() {
  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  console.log('[backend] MongoDB connected');
}

function buildMainApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(morgan('dev'));

  // Always set header when fix is active (affects API/static responses)
  app.use((req, res, next) => {
    if (FIX_ACTIVE) {
      res.set('Referrer-Policy', 'no-referrer');
    }
    next();
  });

  // Helmet referrerPolicy for extra assurance (only when FIX is active)
  app.use((req, res, next) => {
    if (FIX_ACTIVE) {
      helmet.referrerPolicy({ policy: 'no-referrer' })(req, res, next);
    } else {
      next();
    }
  });

  // API: get current policy
  app.get('/api/policy', (req, res) => {
    res.json({ fixActive: FIX_ACTIVE });
  });

  // API: set policy on/off
  app.post('/api/policy', (req, res) => {
    const { fixActive } = req.body || {};
    FIX_ACTIVE = Boolean(fixActive);
    res.json({ ok: true, fixActive: FIX_ACTIVE });
  });

  // API: recent logs
  app.get('/api/logs', async (req, res) => {
    const items = await RequestLog.find().sort({ createdAt: -1 }).limit(200).lean();
    res.json({ items });
  });

  // Serve frontend build if available
  const distPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    // Serve index.html only if it exists
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) next();
    });
  });

  return app;
}

function buildAttackerApp() {
  const attacker = express();
  attacker.use(morgan('tiny'));

  // 1x1 gif buffer
  const pixel = Buffer.from(
    'R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',
    'base64'
  );

  async function logRequest(req) {
    try {
      await RequestLog.create({
        url: req.originalUrl,
        method: req.method,
        headers: req.headers,
        referer: req.get('referer') || '',
        ip: req.ip,
        policySnapshot: `fixActive=${FIX_ACTIVE}`,
      });
    } catch (e) {
      console.error('Failed to log request:', e.message);
    }
  }

  attacker.get('/collect.gif', async (req, res) => {
    await logRequest(req);
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(pixel);
  });

  attacker.get('/landing', async (req, res) => {
    await logRequest(req);
    res.type('html').send(
      `<h1>Attacker landing</h1><p>Referer received: <code>${
        req.get('referer') || '(none)'
      }</code></p>`
    );
  });

  attacker.get('/', (req, res) => {
    res.send('Attacker server up');
  });

  return attacker;
}

(async () => {
  await connectMongo();

  const app = buildMainApp();
  app.listen(PORT, () => {
    console.log(`[backend] Main app listening on http://localhost:${PORT}`);
  });

  const attacker = buildAttackerApp();
  attacker.listen(ATTACKER_PORT, () => {
    console.log(`[attacker] Listening on http://localhost:${ATTACKER_PORT}`);
  });
})();
