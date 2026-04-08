const { createCanvas, registerFont } = require('canvas');

const resolutions = {
  'iphone16promax': { width: 1320, height: 2868 },
  'iphone16pro': { width: 1206, height: 2622 },
  'iphone16plus': { width: 1290, height: 2796 },
  'iphone16': { width: 1179, height: 2556 },
  'iphone15promax': { width: 1290, height: 2796 },
  'iphone15pro': { width: 1179, height: 2556 },
  'iphone15': { width: 1179, height: 2556 },
  'iphonexs': { width: 1125, height: 2436 },
  'default': { width: 1080, height: 2400 }
};

/**
 * Draws a multi-line centered text on a canvas
 */
function drawCenteredText(ctx, text, x, y, maxWidth, lineHeight, font) {
  const parts = text.split('<br>');
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
  const canvas = createCanvas(res.width, res.height);
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

  // 3. Draw Movie Subtitle (Removed per user request to avoid overlap)

  // 4. Branding
  const brandSize = Math.floor(res.width * 0.03);
  ctx.font = `${brandSize}px sans-serif`;
  ctx.fillStyle = palette.text;
  ctx.globalAlpha = 0.2;
  ctx.textAlign = 'center';
  ctx.fillText('kjo-fy.in', centerX, res.height - brandSize * 4);

  return canvas.toBuffer('image/jpeg', { quality: 0.9 });
}

module.exports = { generateWallpaper };
