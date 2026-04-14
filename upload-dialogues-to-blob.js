require('dotenv').config();
const { put } = require('@vercel/blob');
const { generateWallpaper } = require('./utils/wallpaperGenerator');
const fs = require('fs');

const data = JSON.parse(fs.readFileSync('./data/quotes.json', 'utf8'));

// Two tiers covering all modern smartphones
const TIERS = [
  { key: 'iphone', model: 'iphone16pro' },   // 1206×2622 — all iPhones
  { key: 'android', model: 'android_20_9' },  // 1080×2400 — all Android phones
];

async function upload() {
  const total = data.quotes.length;
  console.log(`Generating and uploading ${total} × ${TIERS.length} dialogue wallpapers...`);

  // Load existing manifest to resume from where we left off
  let manifest = {};
  try {
    manifest = JSON.parse(fs.readFileSync('./data/dialogueWallpapers.json', 'utf8'));
    // Convert old string-format entries to new object format
    for (const [k, v] of Object.entries(manifest)) {
      if (typeof v === 'string') manifest[k] = { iphone: v };
    }
  } catch (_) {}

  let uploaded = 0;

  for (let i = 0; i < total; i++) {
    const existing = manifest[i] || {};
    const missing = TIERS.filter(t => !existing[t.key]);
    if (missing.length === 0) {
      uploaded++;
      continue;
    }

    const quote = data.quotes[i];
    const palette = data.palettes[i % data.palettes.length];
    if (!manifest[i]) manifest[i] = {};

    for (const tier of missing) {
      const blobKey = `dialogues/quote_${i}_${tier.key}.jpg`;
      try {
        const buf = await generateWallpaper(quote, palette, tier.model);
        const blob = await put(blobKey, buf, {
          access: 'public',
          contentType: 'image/jpeg',
          addRandomSuffix: false,
          allowOverwrite: true,
        });
        manifest[i][tier.key] = blob.url;
      } catch (e) {
        console.error(`ERROR [${i}/${tier.key}]: ${e.message}`);
      }
    }

    const ok = TIERS.every(t => manifest[i][t.key]);
    if (ok) uploaded++;
    console.log(`[${i + 1}/${total}] quote_${i} → iphone: ${manifest[i].iphone ? '✓' : '✗'}  android: ${manifest[i].android ? '✓' : '✗'}`);

    // Save progress every 50 quotes so we can resume on interruption
    if (i % 50 === 0) {
      fs.writeFileSync('./data/dialogueWallpapers.json', JSON.stringify(manifest, null, 2));
    }
  }

  fs.writeFileSync('./data/dialogueWallpapers.json', JSON.stringify(manifest, null, 2));
  console.log(`Done! ${uploaded}/${total} fully uploaded. Manifest saved.`);
}

upload().catch(console.error);
