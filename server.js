require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { generateWallpaper, resolutions } = require('./utils/wallpaperGenerator');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) throw new Error('JWT_SECRET environment variable is required');

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://kjofy-fin.vercel.app';
const VALID_MODELS = new Set(Object.keys(resolutions));

app.set('trust proxy', 1);
app.use(cors({
  origin: (requestOrigin, callback) => {
    // Allow requests with no origin (iOS Shortcuts, Android apps, curl)
    if (!requestOrigin || requestOrigin === ALLOWED_ORIGIN) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  }
}));
app.use(express.json());
app.disable('x-powered-by');

// Simple in-memory rate limiter for /api endpoints
const rateLimitMap = new Map();
app.use('/api', (req, res, next) => {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const limit = 30; // 30 requests per minute

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, start: now });
  } else {
    const entry = rateLimitMap.get(ip);
    if (now - entry.start > windowMs) {
      entry.count = 1;
      entry.start = now;
    } else {
      entry.count++;
      if (entry.count > limit) {
        return res.status(429).json({ error: 'Too many requests from this IP, please try again after a minute.' });
      }
    }
  }
  next();
});

// Global No-Cache for development
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// 1. Static file serving (RESTRICTED)
// Only serve index.html explicitly to prevent exposing sensitive root files (.env, server.js)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Only serve these specific directories as static
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/favicon.svg', (req, res) => res.sendFile(path.join(__dirname, 'favicon.svg')));
app.use('/data/images', express.static(path.join(__dirname, 'data/images')));

// Load data
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/quotes.json'), 'utf8'));
const imageData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/imageWallpapers.json'), 'utf8'));

/**
 * Seeded shuffle selection
 */
function getDailyItem(items, seed, dateOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dateOffset);
  const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Create a combined seed from user seed and date
  const combined = seed + dateStr;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    hash |= 0;
  }
  
  const index = Math.abs(hash) % items.length;
  return items[index];
}

// 1. Issue Token
app.post('/api/issue-token', (req, res) => {
  const { seed } = req.body;
  if (!seed || typeof seed !== 'string' || seed.length > 64) {
    return res.status(400).json({ error: 'Invalid seed' });
  }

  const token = jwt.sign({ seed }, SECRET_KEY, { expiresIn: '90d' });
  res.json({ token });
});

// 2. Wallpaper Endpoint (POST for Shortcut, GET for testing)
app.all('/api/wallpaper', async (req, res) => {
  try {
    // Get parameters from query or body
    let { seed, model, token } = { ...req.query, ...req.body };

    // If token is provided, verify it
    if (token) {
      try {
        const decoded = jwt.verify(token, SECRET_KEY);
        seed = decoded.seed;
      } catch (e) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }
    if (!seed || typeof seed !== 'string' || seed.length > 64) {
      return res.status(400).json({ error: 'Invalid seed' });
    }

    const safeModel = VALID_MODELS.has(model) ? model : 'default';
    const { type, index } = { ...req.query, ...req.body };

    // New: Request a specific quote by index (for previews/static-like usage)
    if (index !== undefined) {
      const idx = parseInt(index, 10);
      if (isNaN(idx) || idx < 0 || idx >= data.quotes.length) {
        return res.status(400).json({ error: 'Invalid quote index' });
      }
      const quote = data.quotes[idx];
      const palette = data.palettes[idx % data.palettes.length];
      const imageBuffer = await generateWallpaper(quote, palette, safeModel);
      res.set('Content-Type', 'image/jpeg');
      res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours as these are static definitions
      return res.send(imageBuffer);
    }

    if (type === 'image') {
      const wallpaper = getDailyItem(imageData.wallpapers, seed);

      // If Blob URL is available, redirect to it
      if (wallpaper.url) {
        res.set('Cache-Control', 'public, max-age=3600');
        return res.redirect(302, wallpaper.url);
      }

      // Fallback: serve from local filesystem
      const imagePath = path.join(__dirname, 'data/images', wallpaper.filename);
      if (fs.existsSync(imagePath)) {
        res.set('Content-Type', 'image/jpeg');
        res.set('Cache-Control', 'public, max-age=3600');
        return res.sendFile(imagePath);
      } else {
        return res.status(404).json({ error: 'Wallpaper image not found' });
      }
    }

    // Select daily quote and palette
    const quote = getDailyItem(data.quotes, seed);
    const palette = getDailyItem(data.palettes, seed);

    const imageBuffer = await generateWallpaper(quote, palette, safeModel);
    
    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(imageBuffer);
  } catch (error) {
    console.error('Wallpaper generation error:', error);
    res.status(500).json({ error: 'Failed to generate wallpaper' });
  }
});

// 3. Previews Endpoint
app.get('/api/previews', (req, res) => {
  try {
    const quotesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/quotes.json'), 'utf8'));
    const imagesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/imageWallpapers.json'), 'utf8'));
    res.json({
      quotes: quotesData.quotes.slice(0, 30),
      palettes: quotesData.palettes,
      images: imagesData.wallpapers.slice(0, 60)
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load data' });
  }
});

app.listen(PORT, () => {
  console.log(`KJo-fy server running at http://localhost:${PORT}`);
});

module.exports = app;
