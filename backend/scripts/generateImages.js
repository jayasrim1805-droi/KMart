// Optional helper: regenerates the simple SVG product pictures in frontend/assets/images/products.
// Run:  node backend/scripts/generateImages.js
const fs = require('fs');
const path = require('path');
const products = require('./sampleProducts');

const OUT = path.join(__dirname, '..', '..', 'frontend', 'assets', 'images', 'products');
const THEME = {
  'Stationery': { bg: '#FFF1B8', fg: '#14231F', accent: '#0F6B4F' },
  'Books': { bg: '#D7EBE3', fg: '#14231F', accent: '#0F6B4F' },
  'Snacks': { bg: '#FFE0CF', fg: '#14231F', accent: '#E4572E' },
  'Beverages': { bg: '#DDE9F7', fg: '#14231F', accent: '#2F6DB5' },
  'Accessories': { bg: '#E6E1F5', fg: '#14231F', accent: '#5B47B0' },
  'College Essentials': { bg: '#E3EFD0', fg: '#14231F', accent: '#0F6B4F' },
};

const art = {
  'Stationery': (t) => `<rect x="150" y="60" width="100" height="130" rx="8" fill="#fff" stroke="${t.fg}" stroke-width="5"/><path d="M170 95h60M170 120h60M170 145h40" stroke="${t.accent}" stroke-width="5" stroke-linecap="round"/><rect x="258" y="70" width="16" height="120" rx="4" fill="${t.accent}" transform="rotate(18 266 130)"/>`,
  'Books': (t) => `<rect x="120" y="140" width="160" height="34" rx="5" fill="${t.accent}"/><rect x="132" y="102" width="140" height="34" rx="5" fill="#fff" stroke="${t.fg}" stroke-width="5"/><rect x="126" y="64" width="150" height="34" rx="5" fill="${t.fg}"/><path d="M140 80h60" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`,
  'Snacks': (t) => `<rect x="115" y="85" width="170" height="80" rx="14" fill="${t.accent}"/><path d="M135 85v80M165 85v80M195 85v80M225 85v80M255 85v80" stroke="#fff" stroke-opacity=".45" stroke-width="5"/><rect x="115" y="85" width="170" height="80" rx="14" fill="none" stroke="${t.fg}" stroke-width="5"/>`,
  'Beverages': (t) => `<path d="M150 70h100l-12 120a10 10 0 0 1-10 9h-56a10 10 0 0 1-10-9z" fill="#fff" stroke="${t.fg}" stroke-width="5"/><path d="M156 120h88l-6 68h-76z" fill="${t.accent}"/><path d="M215 70l20-30" stroke="${t.fg}" stroke-width="6" stroke-linecap="round"/>`,
  'Accessories': (t) => `<rect x="115" y="92" width="60" height="42" rx="8" fill="${t.fg}"/><path d="M175 113h50c28 0 28 42 56 42" fill="none" stroke="${t.accent}" stroke-width="8" stroke-linecap="round"/><rect x="275" y="138" width="22" height="34" rx="6" fill="#fff" stroke="${t.fg}" stroke-width="5"/>`,
  'College Essentials': (t) => `<rect x="140" y="70" width="120" height="125" rx="26" fill="${t.accent}"/><rect x="160" y="125" width="80" height="45" rx="10" fill="#fff" fill-opacity=".85"/><path d="M170 70c0-30 60-30 60 0" fill="none" stroke="${t.fg}" stroke-width="7"/>`,
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
function wrap(name) {
  const words = name.split(' '); const lines = ['']; 
  for (const w of words) { const last = lines[lines.length - 1]; if ((last + ' ' + w).trim().length > 24 && lines.length < 2) lines.push(w); else lines[lines.length - 1] = (last + ' ' + w).trim(); }
  return lines;
}

fs.mkdirSync(OUT, { recursive: true });
for (const p of products) {
  const t = THEME[p.category];
  const lines = wrap(p.name);
  const text = lines.map((l, i) => `<text x="200" y="${232 + i * 24}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="600" fill="${t.fg}">${esc(l)}</text>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" role="img" aria-label="${esc(p.name)}"><rect width="400" height="300" fill="${t.bg}"/>${art[p.category](t)}${text}</svg>\n`;
  fs.writeFileSync(path.join(OUT, `${p.slug}.svg`), svg);
}
fs.writeFileSync(path.join(OUT, '..', 'placeholder.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" role="img" aria-label="Image not available"><rect width="400" height="300" fill="#E8EEEB"/><rect x="150" y="95" width="100" height="90" rx="10" fill="none" stroke="#7A8A84" stroke-width="6"/><circle cx="185" cy="128" r="10" fill="#7A8A84"/><path d="M158 178l30-30 20 20 15-15 20 25" fill="none" stroke="#7A8A84" stroke-width="6" stroke-linejoin="round"/><text x="200" y="225" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="18" fill="#5C6B65">Image not available</text></svg>\n`);
console.log(`Generated ${products.length} product images + placeholder.`);
