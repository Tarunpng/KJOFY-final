require('dotenv').config();
const { put } = require('@vercel/blob');
const { generateWallpaper } = require('./utils/wallpaperGenerator');
const fs = require('fs');

const data = JSON.parse(fs.readFileSync('./data/quotes.json', 'utf8'));

async function upload() {
  const total = data.quotes.length;
  console.log(`Generating and uploading ${total} dialogue wallpapers...`);

  const results = [];

  for (let i = 0; i < total; i++) {
    const quote = data.quotes[i];
    const palette = data.palettes[i % data.palettes.length];
    const key = `dialogues/quote_${i}.jpg`;

    try {
      const buf = await generateWallpaper(quote, palette, 'iphone16pro');
      const blob = await put(key, buf, {
        access: 'public',
        contentType: 'image/jpeg',
        addRandomSuffix: false,
      });
      console.log(`[${i + 1}/${total}] quote_${i}.jpg → ${blob.url}`);
      results.push({ index: i, url: blob.url });
    } catch (e) {
      console.error(`ERROR [${i}]: ${e.message}`);
      results.push({ index: i, url: null });
    }
  }

  // Save a manifest so server.js can look up URLs by index
  const manifest = {};
  results.forEach(r => { if (r.url) manifest[r.index] = r.url; });
  fs.writeFileSync('./data/dialogueWallpapers.json', JSON.stringify(manifest, null, 2));
  console.log(`Done! ${results.filter(r => r.url).length}/${total} uploaded. Manifest saved.`);
}

upload().catch(console.error);
