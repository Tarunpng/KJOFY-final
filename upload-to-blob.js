require('dotenv').config();
const { put } = require('@vercel/blob');
const fs = require('fs');
const path = require('path');

const imgDir = './data/images';

async function uploadAll() {
  const files = fs.readdirSync(imgDir)
    .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
    .sort();

  console.log(`Uploading ${files.length} images to Vercel Blob...`);

  const wallpapers = [];

  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const filepath = path.join(imgDir, filename);
    const fileBuffer = fs.readFileSync(filepath);
    const ext = path.extname(filename).toLowerCase();
    const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';

    process.stdout.write(`[${i + 1}/${files.length}] Uploading ${filename}...`);

    const blob = await put(`wallpapers/${filename}`, fileBuffer, {
      access: 'public',
      contentType,
    });

    wallpapers.push({
      id: String(i + 1),
      filename,
      url: blob.url,
      title: `Bollywood Wallpaper ${String(i + 1).padStart(3, '0')}`
    });

    console.log(' done');
  }

  fs.writeFileSync('./data/imageWallpapers.json', JSON.stringify({ wallpapers }, null, 2));
  console.log('\nAll done! imageWallpapers.json updated with Blob URLs.');
}

uploadAll().catch(console.error);
