// Generate six self-owned placeholder covers and the compass favicon.
// They are deliberately abstract: replace them with real project images later.
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const media = join(here, '..', 'dist', 'media');
const assets = join(here, '..', 'dist', 'assets');
mkdirSync(media, { recursive: true });
mkdirSync(assets, { recursive: true });

const W = 1620, H = 971;

function ticks(cx, cy, r0, r1, count, stroke, width = 2, opacity = .55) {
  let out = '';
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const inner = i % 9 === 0 ? r0 - 18 : r0;
    out += `<line x1="${(cx + Math.cos(a) * inner).toFixed(1)}" y1="${(cy + Math.sin(a) * inner).toFixed(1)}" x2="${(cx + Math.cos(a) * r1).toFixed(1)}" y2="${(cy + Math.sin(a) * r1).toFixed(1)}" stroke="${stroke}" stroke-width="${i % 9 === 0 ? width * 1.8 : width}" opacity="${opacity}"/>`;
  }
  return out;
}
function rose(cx, cy, r, stroke, width = 2) {
  let out = '';
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 2 + i * Math.PI / 4;
    const rr = i % 2 === 0 ? r : r * .74;
    out += `<line x1="${cx}" y1="${cy}" x2="${(cx + Math.cos(a) * rr).toFixed(1)}" y2="${(cy + Math.sin(a) * rr).toFixed(1)}" stroke="${stroke}" stroke-width="${width}"/>`;
  }
  return out;
}

const covers = [
  {
    file: 'bassel-01.svg', bg: '#0d0d0d', ink: '#f1eee5', brass: '#c9a45c', accent: '#c0492f', number: '01', label: 'MERIDIAN',
    art: `
      <g opacity=".18">${Array.from({ length: 19 }, (_, i) => `<circle cx="810" cy="485" r="${60 + i * 26}" fill="none" stroke="${'#f1eee5'}" stroke-width="1"/>`).join('')}</g>
      <circle cx="810" cy="485" r="330" fill="none" stroke="#c9a45c" stroke-width="3"/>
      <circle cx="810" cy="485" r="292" fill="none" stroke="#c9a45c" stroke-width="1" opacity=".55"/>
      ${ticks(810, 485, 300, 330, 72, '#c9a45c', 2, .7)}
      ${rose(810, 485, 250, '#c9a45c', 2)}
      <path d="M810 235 L846 485 L810 735 L774 485 Z" fill="#c0492f" opacity=".9"/>
      <path d="M810 235 L810 735" stroke="#f1eee5" stroke-width="2" opacity=".5"/>
      <circle cx="810" cy="485" r="18" fill="#c9a45c"/><circle cx="810" cy="485" r="7" fill="#0d0d0d"/>
      <text x="92" y="842" fill="#f1eee5" font-family="Georgia, serif" font-size="270" letter-spacing="-14">01</text>
      <text x="100" y="900" fill="#c9a45c" font-family="Arial, sans-serif" font-size="24" letter-spacing="8">${'MERIDIAN'}</text>
      <text x="1370" y="900" fill="#f1eee5" font-family="Arial, sans-serif" font-size="18" letter-spacing="4" opacity=".55">NAVIGATION STUDY</text>`
  },
  {
    file: 'bassel-02.svg', bg: '#f3efe4', ink: '#16140f', brass: '#a5762f', accent: '#a63a28', number: '02', label: 'PULSE',
    art: `
      <g opacity=".14">${Array.from({ length: 16 }, (_, i) => `<line x1="${120 + i * 100}" y1="90" x2="${120 + i * 100}" y2="880" stroke="#16140f" stroke-width="1"/>`).join('')}</g>
      <circle cx="810" cy="470" r="300" fill="none" stroke="#16140f" stroke-width="2"/>
      <circle cx="810" cy="470" r="230" fill="none" stroke="#a5762f" stroke-width="1.5" stroke-dasharray="4 12"/>
      <path d="M240 560 H560 L610 420 L680 700 L750 470 L810 560 H1380" fill="none" stroke="#a63a28" stroke-width="8" stroke-linejoin="round"/>
      <path d="M240 560 H560 L610 420 L680 700 L750 470 L810 560 H1380" fill="none" stroke="#16140f" stroke-width="1.5" opacity=".4"/>
      ${ticks(810, 470, 260, 300, 36, '#a5762f', 2, .6)}
      <text x="92" y="842" fill="#16140f" font-family="Georgia, serif" font-size="270" letter-spacing="-14">02</text>
      <text x="100" y="900" fill="#a63a28" font-family="Arial, sans-serif" font-size="24" letter-spacing="8">PULSE</text>
      <text x="1370" y="900" fill="#16140f" font-family="Arial, sans-serif" font-size="18" letter-spacing="4" opacity=".55">SIGNAL STUDY</text>`
  },
  {
    file: 'bassel-03.svg', bg: '#efe2c9', ink: '#2b2117', brass: '#a97c3f', accent: '#a8462d', number: '03', label: 'ATLAS',
    art: `
      <g opacity=".22">${Array.from({ length: 22 }, (_, i) => `<line x1="0" y1="${70 + i * 42}" x2="1620" y2="${70 + i * 42}" stroke="#2b2117" stroke-width="1"/>`).join('')}${Array.from({ length: 26 }, (_, i) => `<line x1="${80 + i * 58}" y1="0" x2="${80 + i * 58}" y2="971" stroke="#2b2117" stroke-width="1"/>`).join('')}</g>
      <circle cx="1030" cy="430" r="280" fill="none" stroke="#a8462d" stroke-width="3"/>
      <circle cx="1030" cy="430" r="190" fill="none" stroke="#a8462d" stroke-width="1" opacity=".7"/>
      <path d="M1030 150 L1030 710 M750 430 L1310 430" stroke="#2b2117" stroke-width="1" opacity=".5"/>
      <path d="M1030 250 L1082 430 L1030 610 L978 430 Z" fill="#a97c3f" opacity=".9"/>
      <circle cx="1030" cy="430" r="14" fill="#a8462d"/>
      <text x="92" y="842" fill="#2b2117" font-family="Georgia, serif" font-size="270" letter-spacing="-14">03</text>
      <text x="100" y="900" fill="#a8462d" font-family="Arial, sans-serif" font-size="24" letter-spacing="8">ATLAS</text>
      <text x="1370" y="900" fill="#2b2117" font-family="Arial, sans-serif" font-size="18" letter-spacing="4" opacity=".55">CARTOGRAPHY</text>`
  },
  {
    file: 'bassel-04.svg', bg: '#08131c', ink: '#e6f1f4', brass: '#9fb6bf', accent: '#f0a23a', number: '04', label: 'BEARING',
    art: `
      <g opacity=".18">${Array.from({ length: 8 }, (_, i) => `<circle cx="810" cy="485" r="${90 + i * 52}" fill="none" stroke="#9fb6bf" stroke-width="1"/>`).join('')}</g>
      <path d="M120 780 L300 600 L480 700 L700 420 L900 560 L1120 330 L1320 500 L1500 260" fill="none" stroke="#9fb6bf" stroke-width="1.5" opacity=".5"/>
      ${ticks(810, 485, 310, 350, 72, '#9fb6bf', 2, .7)}
      <circle cx="810" cy="485" r="310" fill="none" stroke="#f0a23a" stroke-width="2" stroke-dasharray="12 18"/>
      <path d="M810 180 L852 485 L810 790 L768 485 Z" fill="#f0a23a" opacity=".92"/>
      <circle cx="810" cy="485" r="16" fill="#e6f1f4"/>
      <text x="92" y="842" fill="#e6f1f4" font-family="Georgia, serif" font-size="270" letter-spacing="-14">04</text>
      <text x="100" y="900" fill="#f0a23a" font-family="Arial, sans-serif" font-size="24" letter-spacing="8">BEARING</text>
      <text x="1370" y="900" fill="#e6f1f4" font-family="Arial, sans-serif" font-size="18" letter-spacing="4" opacity=".55">INSTRUMENT</text>`
  },
  {
    file: 'bassel-05.svg', bg: '#14110a', ink: '#f4f1e8', brass: '#c9a45c', accent: '#c0492f', number: '05', label: 'NORTH',
    art: `
      <g opacity=".2">${Array.from({ length: 14 }, (_, i) => `<circle cx="810" cy="485" r="${40 + i * 34}" fill="none" stroke="#f4f1e8" stroke-width=".8"/>`).join('')}</g>
      ${rose(810, 485, 390, '#c9a45c', 3)}
      ${rose(810, 485, 250, '#c9a45c', 1.5)}
      <circle cx="810" cy="485" r="390" fill="none" stroke="#c9a45c" stroke-width="1" opacity=".7"/>
      <path d="M810 95 L870 425 L810 485 L750 425 Z" fill="#c0492f"/>
      <path d="M810 875 L870 545 L810 485 L750 545 Z" fill="#f4f1e8" opacity=".8"/>
      <circle cx="810" cy="485" r="26" fill="#c9a45c"/><circle cx="810" cy="485" r="10" fill="#14110a"/>
      <text x="92" y="842" fill="#f4f1e8" font-family="Georgia, serif" font-size="270" letter-spacing="-14">05</text>
      <text x="100" y="900" fill="#c9a45c" font-family="Arial, sans-serif" font-size="24" letter-spacing="8">NORTH</text>
      <text x="1370" y="900" fill="#f4f1e8" font-family="Arial, sans-serif" font-size="18" letter-spacing="4" opacity=".55">ORIENTATION</text>`
  },
  {
    file: 'bassel-06.svg', bg: '#fbf8f1', ink: '#16140f', brass: '#a5762f', accent: '#a63a28', number: '06', label: 'FIELD NOTES',
    art: `
      <g opacity=".18">${Array.from({ length: 11 }, (_, i) => `<path d="M-50 ${180 + i * 64} C 360 ${80 + i * 70}, 760 ${300 + i * 46}, 1670 ${120 + i * 66}" fill="none" stroke="#16140f" stroke-width="1"/>`).join('')}</g>
      <circle cx="1100" cy="430" r="230" fill="none" stroke="#a5762f" stroke-width="2"/>
      <circle cx="1100" cy="430" r="160" fill="none" stroke="#a5762f" stroke-width="1" stroke-dasharray="2 10"/>
      ${ticks(1100, 430, 200, 230, 36, '#a5762f', 2, .6)}
      <path d="M1100 220 L1134 430 L1100 640 L1066 430 Z" fill="#a63a28" opacity=".88"/>
      <circle cx="1100" cy="430" r="12" fill="#16140f"/>
      <text x="92" y="842" fill="#16140f" font-family="Georgia, serif" font-size="270" letter-spacing="-14">06</text>
      <text x="100" y="900" fill="#a63a28" font-family="Arial, sans-serif" font-size="24" letter-spacing="8">FIELD NOTES</text>
      <text x="1320" y="900" fill="#16140f" font-family="Arial, sans-serif" font-size="18" letter-spacing="4" opacity=".55">OBSERVATION</text>`
  },
];

for (const cover of covers) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="${cover.bg}"/>
    ${cover.art}
  </svg>\n`;
  writeFileSync(join(media, cover.file), svg);
}

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#0d0d0d"/>
  <circle cx="32" cy="32" r="22" fill="none" stroke="#c9a45c" stroke-width="2"/>
  <circle cx="32" cy="32" r="15" fill="none" stroke="#c9a45c" stroke-width=".8" opacity=".55"/>
  <path d="M32 11 L37 32 L32 53 L27 32 Z" fill="#c0492f"/>
  <path d="M32 11 L32 53" stroke="#f4f1e8" stroke-width="1" opacity=".5"/>
  <circle cx="32" cy="32" r="3.2" fill="#c9a45c"/>
</svg>\n`;
writeFileSync(join(assets, 'favicon-compass.svg'), favicon);
console.log('covers: 6 SVG files; favicon written');
