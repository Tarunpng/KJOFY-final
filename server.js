require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { generateWallpaper } = require('./utils/wallpaperGenerator');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'kjo-fy-secret-stable-key';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// Load quotes and palettes
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/quotes.json'), 'utf8'));

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
  if (!seed) return res.status(400).json({ error: 'Seed required' });

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

    if (!seed) return res.status(400).json({ error: 'Seed required' });

    // Select daily quote and palette
    const quote = getDailyItem(data.quotes, seed);
    const palette = getDailyItem(data.palettes, seed);

    const imageBuffer = await generateWallpaper(quote, palette, model || 'default');
    
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
  // Return first 30 quotes for the preview marquee
  res.json({
    quotes: data.quotes.slice(0, 30),
    palettes: data.palettes
  });
});

app.listen(PORT, () => {
  console.log(`KJo-fy server running at http://localhost:${PORT}`);
});
