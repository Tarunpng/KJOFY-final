const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

// Extraction regex for quotes
const quotesMatch = html.match(/const quotes = (\[[\s\S]*?\]);/);
if (quotesMatch) {
  try {
    // We need to handle the fact that it's JS, not perfect JSON
    // A simple way is to evaluate it in a sandbox if possible, or just use a more robust parser
    // But since it's simple objects, we can clean it up or use 'eval' (carefully)
    const quotesStr = quotesMatch[1]
      .replace(/<br>/g, '\\n') // preserve newlines
      .replace(/<br\/>/g, '\\n');
    
    // Using Function to safely evaluate the JS array literal
    const quotes = new Function(`return ${quotesStr}`)();
    
    // Extraction for palettes
    const palettesMatch = html.match(/const palettes = (\[[\s\S]*?\]);/);
    const palettes = palettesMatch ? new Function(`return ${palettesMatch[1]}`)() : [];

    const data = { quotes, palettes };
    
    if (!fs.existsSync('data')) fs.mkdirSync('data');
    fs.writeFileSync('data/quotes.json', JSON.stringify(data, null, 2));
    console.log('Successfully extracted quotes and palettes to data/quotes.json');
  } catch (e) {
    console.error('Extraction failed:', e);
  }
} else {
  console.error('Could not find quotes array in index.html');
}
