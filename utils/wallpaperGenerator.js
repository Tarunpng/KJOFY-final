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

  // Samsung Galaxy S26
  'samsung_s26ultra': { width: 1440, height: 3120 },
  'samsung_s26plus':  { width: 1440, height: 3120 },
  'samsung_s26':      { width: 1080, height: 2340 },

  // Samsung Galaxy S25
  'samsung_s25ultra': { width: 1440, height: 3120 },
  'samsung_s25plus':  { width: 1440, height: 3120 },
  'samsung_s25':      { width: 1080, height: 2340 },

  // Samsung Galaxy S24
  'samsung_s24ultra': { width: 1440, height: 3120 },
  'samsung_s24plus':  { width: 1440, height: 3120 },
  'samsung_s24':      { width: 1080, height: 2340 },
  'samsung_s24fe':    { width: 1080, height: 2340 },

  // Samsung Galaxy S23
  'samsung_s23ultra': { width: 1440, height: 3088 },
  'samsung_s23plus':  { width: 1080, height: 2340 },
  'samsung_s23':      { width: 1080, height: 2340 },
  'samsung_s23fe':    { width: 1080, height: 2340 },

  // Samsung Galaxy Z Fold
  'samsung_zfold7': { width: 1176, height: 2424 },
  'samsung_zfold6': { width: 968,  height: 2076 },
  'samsung_zfold5': { width: 904,  height: 2096 },

  // Samsung Galaxy Z Flip
  'samsung_zflip7': { width: 1080, height: 2640 },
  'samsung_zflip6': { width: 1080, height: 2640 },
  'samsung_zflip5': { width: 1080, height: 2640 },

  // Samsung Galaxy A
  'samsung_a55': { width: 1080, height: 2340 },
  'samsung_a54': { width: 1080, height: 2340 },
  'samsung_a35': { width: 1080, height: 2340 },

  // Legacy Samsung aliases
  's24ultra': { width: 1440, height: 3120 },
  's24plus':  { width: 1440, height: 3120 },
  's24base':  { width: 1080, height: 2340 },

  // Google Pixel 10
  'pixel10proxl': { width: 1344, height: 2992 },
  'pixel10pro':   { width: 1344, height: 2992 },
  'pixel10':      { width: 1080, height: 2424 },

  // Google Pixel 9
  'pixel9proxl':  { width: 1344, height: 2992 },
  'pixel9pro':    { width: 1080, height: 2424 },
  'pixel9profold':{ width: 1080, height: 2424 },
  'pixel9':       { width: 1080, height: 2424 },
  'pixel9a':      { width: 1080, height: 2424 },
  'pixel9base':   { width: 1080, height: 2424 },

  // Google Pixel 8
  'pixel8pro': { width: 1344, height: 2992 },
  'pixel8':    { width: 1080, height: 2400 },
  'pixel8a':   { width: 1080, height: 2400 },

  // Google Pixel 7
  'pixel7pro': { width: 1440, height: 3120 },
  'pixel7':    { width: 1080, height: 2400 },
  'pixel7a':   { width: 1080, height: 2400 },

  // OnePlus
  'oneplus15':      { width: 1264, height: 2780 },
  'oneplus15pro':   { width: 1264, height: 2780 },
  'oneplus13':      { width: 1264, height: 2780 },
  'oneplus13r':     { width: 1080, height: 2392 },
  'oneplus12':      { width: 1440, height: 3168 },
  'oneplus12r':     { width: 1080, height: 2392 },
  'oneplusopen2':   { width: 1080, height: 2484 },
  'oneplusopen':    { width: 1116, height: 2484 },
  'oneplusnord4':   { width: 1080, height: 2400 },
  'oneplusnordce4': { width: 1080, height: 2400 },

  // Xiaomi
  'xiaomi15ultra':   { width: 1440, height: 3200 },
  'xiaomi15pro':     { width: 1200, height: 2670 },
  'xiaomi15':        { width: 1200, height: 2670 },
  'xiaomi14ultra':   { width: 1320, height: 2880 },
  'xiaomi14pro':     { width: 1200, height: 2670 },
  'xiaomi14':        { width: 1200, height: 2670 },
  'redminote14pro':  { width: 1220, height: 2712 },
  'redminote14':     { width: 1080, height: 2400 },
  'pocof7pro':       { width: 1440, height: 3200 },
  'pocof7':          { width: 1080, height: 2400 },

  // Nothing Phone
  'nothing2a': { width: 1080, height: 2412 },
  'nothing2':  { width: 1080, height: 2412 },
  'nothing1':  { width: 1080, height: 2400 },

  // Realme
  'realmegtneo6': { width: 1264, height: 2780 },
  'realme13pro':  { width: 1080, height: 2392 },

  // Motorola
  'motorizr50ultra': { width: 1080, height: 2640 },
  'motoedge50ultra': { width: 1220, height: 2712 },

  // Vivo
  'vivo_x200pro': { width: 1260, height: 2800 },
  'vivo_x200':    { width: 1260, height: 2800 },

  // iQOO
  'iqoo13': { width: 1440, height: 3168 },
  'iqoo12': { width: 1440, height: 3168 },

  // Android Common Ratios
  'android_20_9':    { width: 1080, height: 2400 },
  'android_19_5_9':  { width: 1080, height: 2340 },
  'android_16_9':    { width: 1080, height: 1920 },

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
  ctx.fillText('kjo-fy.in', centerX, res.height - brandSize * 4);

  return await canvas.toBuffer('jpg', { quality: 0.9 });
}

module.exports = { generateWallpaper, resolutions };
