const { Canvas } = require('skia-canvas');

const resolutions = {
  // iPhone 16 Series
  'iphone16promax': { width: 1320, height: 2868 },
  'iphone16pro': { width: 1206, height: 2622 },
  'iphone16plus': { width: 1290, height: 2796 },
  'iphone16': { width: 1179, height: 2556 },

  // iPhone 15 & 14 Pro Series (Dynamic Island models)
  'iphone15promax': { width: 1290, height: 2796 },
  'iphone15pro': { width: 1179, height: 2556 },
  'iphone15plus': { width: 1290, height: 2796 },
  'iphone15': { width: 1179, height: 2556 },
  'iphone14promax': { width: 1290, height: 2796 },
  'iphone14pro': { width: 1179, height: 2556 },

  // iPhone 14, 13, 12 Series (Standard Notch)
  'iphone14plus': { width: 1284, height: 2778 },
  'iphone14': { width: 1170, height: 2532 },
  'iphone13promax': { width: 1284, height: 2778 },
  'iphone13pro': { width: 1170, height: 2532 },
  'iphone13': { width: 1170, height: 2532 },
  'iphone13mini': { width: 1080, height: 2340 },
  'iphone12promax': { width: 1284, height: 2778 },
  'iphone12pro': { width: 1170, height: 2532 },
  'iphone12': { width: 1170, height: 2532 },
  'iphone12mini': { width: 1080, height: 2340 },

  // Older iPhones
  'iphone11promax': { width: 1242, height: 2688 },
  'iphone11pro': { width: 1125, height: 2436 },
  'iphone11': { width: 828, height: 1792 },
  'iphonexsmax': { width: 1242, height: 2688 },
  'iphonexs': { width: 1125, height: 2436 },
  'iphonexr': { width: 828, height: 1792 },
  'iphonex': { width: 1125, height: 2436 },
  'iphonese3': { width: 750, height: 1334 },
  'iphonese2': { width: 750, height: 1334 },

  // Android Flagships
  's24ultra': { width: 1440, height: 3120 },
  's24plus': { width: 1440, height: 3120 },
  's24base': { width: 1080, height: 2340 },
  'pixel9proxl': { width: 1344, height: 2992 },
  'pixel9base': { width: 1080, height: 2424 },
  'oneplus12': { width: 1440, height: 3168 },
  'xiaomi14': { width: 1200, height: 2670 },

  // Android Common Ratios
  'android_20_9': { width: 1080, height: 2400 },
  'android_19_5_9': { width: 1080, height: 2340 },
  'android_16_9': { width: 1080, height: 1920 },
  
  'default': { width: 1080, height: 2400 }
};

/**
 * Draws a multi-line centered text on a canvas
 */
function drawCenteredText(ctx, text, x, y, maxWidth, lineHeight, font) {
  const parts = text.includes('<br>') ? text.split('<br>') : text.split('\n');
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const totalHeight = parts.length * lineHeight;
  let startY = y - (totalHeight / 2) + (lineHeight / 2);

  parts.forEach((line) => {
    ctx.fillText(line.replace(/\\n/g, ''), x, startY);
    startY += lineHeight;
  });
}

function parseGradient(bgStr) {
  // Simple parser for linear-gradient(160deg, #800000, #320000)
  const colors = bgStr.match(/#[0-9a-fA-F]{6}/g);
  if (colors && colors.length >= 2) {
    return colors;
  }
  return ['#0C0C0C', '#000000'];
}

async function generateWallpaper(quote, palette, modelKey) {
  const res = resolutions[modelKey] || resolutions['default'];
  const canvas = new Canvas(res.width, res.height);
  const ctx = canvas.getContext('2d');

  // 1. Draw Background Gradient
  const [c1, c2] = parseGradient(palette.bg);
  const gradient = ctx.createLinearGradient(0, 0, res.width, res.height);
  gradient.addColorStop(0, c1);
  gradient.addColorStop(1, c2);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, res.width, res.height);

  // 2. Draw Quote
  const fontSize = Math.floor(res.width * 0.08); // Responsive font size
  ctx.fillStyle = palette.text;
  const fontStyle = `bold ${fontSize}px sans-serif`;
  
  // Center is roughly vertically centered but slightly higher to avoid overlapping with bottom gestures
  const centerX = res.width / 2;
  const centerY = res.height / 2;
  
  drawCenteredText(ctx, quote.text, centerX, centerY, res.width * 0.85, fontSize * 1.3, fontStyle);

  // 4. Branding
  const brandSize = Math.floor(res.width * 0.03);
  ctx.font = `${brandSize}px sans-serif`;
  ctx.fillStyle = palette.text;
  ctx.globalAlpha = 0.2;
  ctx.textAlign = 'center';
  ctx.fillText('kjofy.com', centerX, res.height - brandSize * 4);

  return await canvas.toBuffer('jpg', { quality: 0.9 });
}

module.exports = { generateWallpaper, resolutions };
