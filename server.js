require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Razorpay = require('razorpay');
const { generateWallpaper, resolutions } = require('./utils/wallpaperGenerator');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) throw new Error('JWT_SECRET environment variable is required');

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://kjofy.com';
const VALID_MODELS = new Set(Object.keys(resolutions));

const RZP_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RZP_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const PRICE_PAISE = 1900; // ₹19

let rzp = null;
if (RZP_KEY_ID && RZP_KEY_SECRET) {
  try {
    rzp = new Razorpay({ key_id: RZP_KEY_ID, key_secret: RZP_KEY_SECRET });
  } catch(e) {
    console.error('Razorpay init error:', e.message);
  }
}

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
// Purge stale entries every 5 minutes to prevent memory leak
setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 1000;
  for (const [ip, entry] of rateLimitMap) {
    if (entry.start < cutoff) rateLimitMap.delete(ip);
  }
}, 5 * 60 * 1000);

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

// Redirect all non-canonical requests to kjofy.com
app.use((req, res, next) => {
  const host = req.headers.host || '';
  if (host && host !== 'kjofy.com' && host !== 'www.kjofy.com' && !host.startsWith('localhost')) {
    return res.redirect(301, 'https://kjofy.com' + req.originalUrl);
  }
  next();
});

// Security headers
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://checkout.razorpay.com; connect-src 'self' https://api.razorpay.com; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; frame-src https://api.razorpay.com;");
  next();
});

// Global No-Cache for API routes
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
  // Use IST (UTC+5:30) so wallpaper changes at midnight India time, not 5:30 AM
  const d = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  d.setUTCDate(d.getUTCDate() + dateOffset);
  const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD in IST
  
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

  const token = jwt.sign({ seed }, SECRET_KEY, { expiresIn: '365d' });
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
        // If token is merely expired (not tampered), allow with seed from payload
        if (e.name === 'TokenExpiredError') {
          const decoded = jwt.decode(token);
          if (decoded && decoded.seed) {
            seed = decoded.seed;
          } else {
            return res.status(401).json({ error: 'Invalid token' });
          }
        } else {
          return res.status(401).json({ error: 'Invalid token' });
        }
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

    const imageBuffer = await Promise.race([
      generateWallpaper(quote, palette, safeModel),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Wallpaper generation timeout')), 15000))
    ]);

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

// 4. Subscription: Config
app.get('/api/subscription/config', (req, res) => {
  if (!RZP_KEY_ID) return res.status(503).json({ error: 'Payment not configured' });
  res.json({ keyId: RZP_KEY_ID });
});

// 5. Subscription: Create Order
app.post('/api/subscription/create-order', async (req, res) => {
  if (!rzp) return res.status(503).json({ error: 'Payment not configured' });
  const { seed } = req.body;
  if (!seed || typeof seed !== 'string' || seed.length > 64) {
    return res.status(400).json({ error: 'Invalid seed' });
  }
  try {
    const order = await rzp.orders.create({
      amount: PRICE_PAISE,
      currency: 'INR',
      receipt: `kjofy_${Date.now()}`,
      notes: { seed },
    });
    res.json({ orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (e) {
    console.error('Razorpay order error:', e);
    res.status(500).json({ error: 'Could not create order' });
  }
});

// 6. Subscription: Verify Payment
app.post('/api/subscription/verify', (req, res) => {
  if (!rzp) return res.status(503).json({ error: 'Payment not configured' });
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, seed } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !seed) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const expected = crypto
    .createHmac('sha256', RZP_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');
  if (expected !== razorpay_signature) {
    return res.status(400).json({ error: 'Invalid signature' });
  }
  const subToken = jwt.sign({ seed, subscribed: true, payment_id: razorpay_payment_id }, SECRET_KEY, { expiresIn: '10y' });
  res.json({ subToken });
});

// 7. Subscription: Restore Access
app.post('/api/subscription/restore', async (req, res) => {
  if (!rzp) return res.status(503).json({ error: 'Payment not configured' });
  const { payment_id, seed } = req.body;
  if (!payment_id || !/^pay_[A-Za-z0-9]+$/.test(payment_id) || !seed || typeof seed !== 'string' || seed.length > 64) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  try {
    const payment = await rzp.payments.fetch(payment_id);
    if (payment.status !== 'captured' || payment.amount !== PRICE_PAISE || payment.currency !== 'INR') {
      return res.status(400).json({ error: 'Payment not valid for this plan' });
    }
    const subToken = jwt.sign({ seed, subscribed: true, payment_id }, SECRET_KEY, { expiresIn: '10y' });
    res.json({ subToken });
  } catch (e) {
    console.error('Razorpay restore error:', e);
    res.status(400).json({ error: 'Payment not found or invalid' });
  }
});

app.listen(PORT, () => {
  console.log(`KJo-fy server running at http://localhost:${PORT}`);
});

module.exports = app;
