const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// Use powerful regex to remove quotes and palettes arrays
const newHtml = html
  .replace(/const quotes = \[\s*\{[\s\S]*?\n\s*\];/g, 'const quotes = []; // Fetching from backend...')
  .replace(/const palettes = \[\s*\{[\s\S]*?\n\s*\];/g, 'const palettes = []; // Fetching from backend...');

fs.writeFileSync('index.html', newHtml);
console.log('Removed quotes and palettes from index.html');
