const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// Use powerful regex to remove quotes and palettes arrays
html = html.replace(/const quotes = \[\s*\{[\s\S]*?\n\s*\];/g, 'let quotes = [];');
html = html.replace(/const palettes = \[\s*\{[\s\S]*?\n\s*\];/g, 'let palettes = [];');

// Wrap preview initialization in a fetch call
const fetchSnippet = `
  async function loadPreviews() {
    try {
      const res = await fetch('http://localhost:3000/api/previews');
      if (!res.ok) throw new Error('API down');
      const data = await res.json();
      quotes = data.quotes;
      palettes = data.palettes;

      if (quotes.length > 0) {
        initPopupPreview();
      }
    } catch (e) {
      console.warn('Could not load previews from backend', e);
    }
  }
  loadPreviews();
`;

// Insert the fetch before seeded preview shuffle
html = html.replace(/\/\/ ─── Seeded preview shuffle/, fetchSnippet + '\n  // ─── Seeded preview shuffle');

// Change URL logic to use token
html = html.replace(/urlEl\.textContent = 'https:\/\/kjo-fy\.in\/api\/wallpaper';/g, "urlEl.textContent = `http://localhost:3000/api/wallpaper?token=${LINK_TOKEN}&model=${model}`;");
html = html.replace(/urlText\.textContent = `https:\/\/kjo-fy\.in\/api\/wallpaper`;/g, "urlText.textContent = `http://localhost:3000/api/wallpaper?token=${LINK_TOKEN}&model=${modelSelect.value || androidRes.value}`;");

// Rename IIFEs to functions so we can call them after fetch
html = html.replace(/\(function initPopupPreview\(\) \{/, 'function initPopupPreview() {');
html = html.replace(/\}\)\(\); \/\/ End initPopupPreview/, '}'); // Doesn't have this comment, let's fix below:
html = html.replace(/grid2\.appendChild\(buildCards\(row2, 3\)\);\n    grid2\.appendChild\(buildCards\(row2, 3\)\);\n  }\)\(\);/g, 'grid2.appendChild(buildCards(row2, 3));\n    grid2.appendChild(buildCards(row2, 3));\n  }');

// Change the previewPerm init since quotes might be empty initially
html = html.replace(/const previewPerm = seededPermutation\(quotes\.length, USER_SEED\);/g, `
  let previewPerm = [];
  function startPreviewInterval() {
    if (quotes.length === 0) return;
    previewPerm = seededPermutation(quotes.length, USER_SEED);
    setInterval(() => {
      qi = (qi + 1) % quotes.length;
      const shuffledIdx = previewPerm[qi];
      const q = quotes[shuffledIdx];
      const p = palettes[shuffledIdx % palettes.length];
      
      phoneScreen.style.opacity = 0;
      setTimeout(() => {
        phoneScreen.style.background = p.bg;
        phoneScreen.querySelector('.quote-text').style.color = p.text;
        safeSetQuoteHTML(phoneScreen.querySelector('.quote-text'), q.text);
        phoneScreen.querySelector('.brand-mark').style.color = p.sub;
        phoneScreen.querySelector('.lock-time').style.color = '#fff';
        phoneScreen.querySelector('.lock-daydate').style.color = 'rgba(255,255,255,0.85)';
        phoneScreen.style.opacity = 1;
      }, 350);
    }, 3500);
  }
`);

// The previous setInterval Needs removing entirely because we replaced it above. 
// I'll run a careful replace. Actually, rewriting just the top level JS may be easier.
fs.writeFileSync('patch_html.js', html);
