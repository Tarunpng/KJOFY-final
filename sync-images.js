const fs = require('fs');
const path = require('path');

const imgDir = path.join(__dirname, 'data/images');
const files = fs.readdirSync(imgDir);

const wallpapers = files
  .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
  .map((f, i) => ({
    id: (i + 1).toString(),
    filename: f,
    title: `Iconic Scene ${i + 1}`
  }));

fs.writeFileSync(
  path.join(__dirname, 'data/imageWallpapers.json'),
  JSON.stringify({ wallpapers }, null, 2),
  'utf8'
);

console.log(`Updated imageWallpapers.json with ${wallpapers.length} items.`);
