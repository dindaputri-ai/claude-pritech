// Stand-in asset generator for the I-Talk site.
// Draws each asset as SVG in Pritech colors and renders it with Playwright.
// Replace any output in ./assets with a Higgsfield render of the same name and size ratio.
// Usage: node assets-src/make-assets.js
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const OUT = path.resolve(__dirname, '../assets');
const C = { accent: '#f26a30', deep: '#d8521c', ink: '#201d1b', cream: '#fdfbf8', cream2: '#f7f2ec', taupe: '#b5a99c', taupeD: '#8a7d71', taupeL: '#d9d0c6' };

// optional: serve Google Fonts from a local cache (FONT_CACHE=dir with css.txt + map.txt)
async function routeFonts(page) {
  const dir = process.env.FONT_CACHE;
  if (!dir) return;
  const map = Object.fromEntries(fs.readFileSync(path.join(dir, 'map.txt'), 'utf8').trim().split('\n').map(l => l.split(' ')));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route => {
    const url = route.request().url();
    if (url.includes('googleapis')) return route.fulfill({ contentType: 'text/css', body: fs.readFileSync(path.join(dir, 'css.txt')) });
    const f = map[url];
    return f ? route.fulfill({ contentType: 'font/woff2', body: fs.readFileSync(path.join(dir, f)) }) : route.abort();
  });
}

/* ---------- shared defs ---------- */
const defs = `
<defs>
  <linearGradient id="gloss" x1="0" x2="1">
    <stop offset="0" stop-color="${C.ink}"/><stop offset=".28" stop-color="${C.taupeD}" stop-opacity=".9"/>
    <stop offset=".4" stop-color="${C.ink}"/><stop offset=".82" stop-color="${C.ink}"/><stop offset="1" stop-color="${C.deep}" stop-opacity=".85"/>
  </linearGradient>
  <linearGradient id="matte" x1="0" x2="1">
    <stop offset="0" stop-color="${C.ink}"/><stop offset=".35" stop-color="#3a3430"/><stop offset=".7" stop-color="${C.ink}"/><stop offset="1" stop-color="${C.deep}" stop-opacity=".7"/>
  </linearGradient>
  <linearGradient id="ring" x1="0" x2="1">
    <stop offset="0" stop-color="${C.deep}"/><stop offset=".4" stop-color="${C.accent}"/><stop offset=".55" stop-color="#ffb48f"/><stop offset=".7" stop-color="${C.accent}"/><stop offset="1" stop-color="${C.deep}"/>
  </linearGradient>
  <linearGradient id="tube" x1="0" x2="0" y1="0" y2="1">
    <stop offset="0" stop-color="${C.taupeD}"/><stop offset=".45" stop-color="${C.ink}"/><stop offset="1" stop-color="${C.ink}"/>
  </linearGradient>
  <pattern id="mesh" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect width="12" height="12" fill="${C.ink}"/><circle cx="6" cy="6" r="3.4" fill="${C.taupeD}" opacity=".55"/>
  </pattern>
  <radialGradient id="cushion" cx=".45" cy=".4" r=".7">
    <stop offset="0" stop-color="${C.cream}"/><stop offset=".7" stop-color="${C.cream2}"/><stop offset="1" stop-color="${C.taupe}"/>
  </radialGradient>
  <radialGradient id="cup" cx=".35" cy=".35" r=".8">
    <stop offset="0" stop-color="#4a423c"/><stop offset=".55" stop-color="${C.ink}"/><stop offset="1" stop-color="${C.ink}"/>
  </radialGradient>
  <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18"/></filter>
  <filter id="softS" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="bloom" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="40"/></filter>
  <filter id="noise"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .13 0 0 0 0 .11 0 0 0 0 .1 0 0 0 1.2 -.4"/></filter>
</defs>`;

/* ---------- props (drawn in a 1024 box) ---------- */
const micG = () => `
<g>
  <!-- boom arm -->
  <g stroke-linecap="round" fill="none">
    <path d="M150 1010 L 300 590 L 560 760" stroke="${C.ink}" stroke-width="30"/>
    <path d="M150 1010 L 300 590 L 560 760" stroke="${C.taupeD}" stroke-width="6" transform="translate(-6 -5)" opacity=".8"/>
    <path d="M175 960 L 300 640" stroke="${C.taupe}" stroke-width="4" stroke-dasharray="6 7" opacity=".7"/>
    <path d="M330 610 L 520 735" stroke="${C.taupe}" stroke-width="4" stroke-dasharray="6 7" opacity=".7"/>
    <path d="M150 1010 L 300 590 L 560 760" stroke="${C.accent}" stroke-width="3" transform="translate(9 6)" opacity=".55"/>
  </g>
  <circle cx="300" cy="590" r="30" fill="${C.ink}"/><circle cx="300" cy="590" r="12" fill="${C.accent}"/>
  <rect x="110" y="985" width="90" height="40" rx="10" fill="${C.ink}"/>
  <!-- yoke -->
  <path d="M480 700 Q 560 820 700 690" fill="none" stroke="${C.ink}" stroke-width="26" stroke-linecap="round"/>
  <g transform="rotate(-18 610 420)">
    <!-- rim glow -->
    <rect x="490" y="120" width="250" height="600" rx="125" fill="${C.accent}" opacity=".55" filter="url(#soft)" transform="translate(18 0)"/>
    <!-- body -->
    <rect x="490" y="370" width="240" height="330" rx="40" fill="url(#gloss)"/>
    <rect x="512" y="390" width="22" height="280" rx="11" fill="${C.cream}" opacity=".28"/>
    <!-- grille -->
    <path d="M490 330 L490 230 A120 120 0 0 1 730 230 L730 330 Z" fill="url(#mesh)"/>
    <path d="M490 330 L490 230 A120 120 0 0 1 730 230 L730 330 Z" fill="url(#gloss)" opacity=".45"/>
    <path d="M520 220 A90 90 0 0 1 600 140" fill="none" stroke="${C.cream}" stroke-width="10" stroke-linecap="round" opacity=".45"/>
    <!-- accent ring -->
    <rect x="482" y="326" width="256" height="50" rx="12" fill="url(#ring)"/>
    <rect x="482" y="326" width="256" height="8" rx="4" fill="${C.cream}" opacity=".35"/>
    <!-- base cap -->
    <rect x="510" y="690" width="200" height="34" rx="14" fill="${C.ink}"/>
    <circle cx="610" cy="560" r="16" fill="${C.ink}" stroke="${C.taupeD}" stroke-width="3"/>
  </g>
</g>`;

const headG = () => `
<g>
  <ellipse cx="512" cy="900" rx="330" ry="34" fill="${C.ink}" opacity=".35" filter="url(#softS)"/>
  <!-- band -->
  <path d="M230 600 C 230 260, 794 260, 794 600" fill="none" stroke="${C.ink}" stroke-width="54" stroke-linecap="round"/>
  <path d="M250 560 C 260 300, 764 300, 774 560" fill="none" stroke="${C.cream2}" stroke-width="20" stroke-linecap="round" opacity=".9"/>
  <!-- sliders -->
  <rect x="206" y="540" width="48" height="90" rx="14" fill="${C.accent}"/>
  <rect x="770" y="540" width="48" height="90" rx="14" fill="${C.accent}"/>
  <!-- left cup (outside face) -->
  <g transform="rotate(8 240 720)">
    <ellipse cx="250" cy="720" rx="130" ry="165" fill="${C.accent}" opacity=".45" filter="url(#soft)"/>
    <ellipse cx="240" cy="720" rx="122" ry="156" fill="url(#cup)"/>
    <ellipse cx="240" cy="720" rx="86" ry="112" fill="none" stroke="${C.accent}" stroke-width="10"/>
    <ellipse cx="210" cy="660" rx="30" ry="50" fill="${C.cream}" opacity=".12"/>
  </g>
  <!-- right cup (cushion side) -->
  <g transform="rotate(-10 790 720)">
    <ellipse cx="800" cy="720" rx="118" ry="152" fill="url(#cup)"/>
    <ellipse cx="780" cy="720" rx="100" ry="136" fill="url(#cushion)"/>
    <ellipse cx="780" cy="720" rx="52" ry="80" fill="${C.taupe}" opacity=".55"/>
    <ellipse cx="780" cy="720" rx="40" ry="66" fill="${C.ink}" opacity=".55"/>
    <circle cx="780" cy="720" r="6" fill="${C.accent}"/>
  </g>
</g>`;

const signG = (withHalo = true) => `
<g>
  ${withHalo ? `<rect x="130" y="330" width="764" height="364" rx="90" fill="${C.accent}" opacity=".75" filter="url(#bloom)"/>` : ''}
  <rect x="112" y="312" width="800" height="400" rx="88" fill="${C.ink}"/>
  <rect x="112" y="312" width="800" height="400" rx="88" fill="none" stroke="${C.taupeD}" stroke-width="6" opacity=".7"/>
  <rect x="146" y="346" width="732" height="332" rx="62" fill="url(#signFace)"/>
  <rect x="146" y="346" width="732" height="332" rx="62" fill="none" stroke="#ffd2b8" stroke-width="3" opacity=".6"/>
  <text x="512" y="568" text-anchor="middle" font-family="IBM Plex Sans" font-weight="700" font-size="158" letter-spacing="4" fill="${C.cream}" filter="url(#textGlow)">ON AIR</text>
  <text x="512" y="568" text-anchor="middle" font-family="IBM Plex Sans" font-weight="700" font-size="158" letter-spacing="4" fill="${C.cream}">ON AIR</text>
  <rect x="190" y="372" width="644" height="22" rx="11" fill="${C.cream}" opacity=".22"/>
  <circle cx="190" cy="356" r="0"/>
</g>`;
const signDefs = `
<defs>
  <radialGradient id="signFace" cx=".5" cy=".45" r=".75">
    <stop offset="0" stop-color="#ff9a68"/><stop offset=".5" stop-color="${C.accent}"/><stop offset="1" stop-color="${C.deep}"/>
  </radialGradient>
  <filter id="textGlow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="10"/></filter>
</defs>`;

/* ---------- studio scene ---------- */
function foam(x, y, cols, rows, s = 100, gap = 12) {
  let out = '';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const tx = x + c * (s + gap), ty = y + r * (s + gap);
    const rot = (r + c) % 2 ? 90 : 0;
    out += `<g transform="rotate(${rot} ${tx + s / 2} ${ty + s / 2})"><rect x="${tx}" y="${ty}" width="${s}" height="${s}" rx="8" fill="url(#foamP)"/></g>`;
  }
  return `<g opacity=".9">${out}<rect x="${x - 10}" y="${y - 10}" width="${cols * (s + gap) + 8}" height="${rows * (s + gap) + 8}" rx="14" fill="url(#foamShade)"/></g>`;
}
function clock(cx, cy, r) {
  let ticks = '';
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6, r1 = r * .78, r2 = r * (i % 3 ? .86 : .9);
    ticks += `<line x1="${cx + Math.sin(a) * r1}" y1="${cy - Math.cos(a) * r1}" x2="${cx + Math.sin(a) * r2}" y2="${cy - Math.cos(a) * r2}" stroke="${C.ink}" stroke-width="${i % 3 ? 3 : 6}" stroke-linecap="round"/>`;
  }
  return `<g>
    <circle cx="${cx + 8}" cy="${cy + 12}" r="${r + 10}" fill="${C.ink}" opacity=".5" filter="url(#softS)"/>
    <circle cx="${cx}" cy="${cy}" r="${r + 10}" fill="${C.ink}"/>
    <circle cx="${cx}" cy="${cy}" r="${r + 10}" fill="none" stroke="${C.taupeD}" stroke-width="3"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.cream2}"/>
    ${ticks}
    <line x1="${cx}" y1="${cy}" x2="${cx - r * .32}" y2="${cy - r * .42}" stroke="${C.ink}" stroke-width="8" stroke-linecap="round"/>
    <line x1="${cx}" y1="${cy}" x2="${cx + r * .58}" y2="${cy - r * .2}" stroke="${C.ink}" stroke-width="5" stroke-linecap="round"/>
    <line x1="${cx - r * .2}" y1="${cy + r * .25}" x2="${cx + r * .45}" y2="${cy - r * .55}" stroke="${C.accent}" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="${cx}" cy="${cy}" r="7" fill="${C.accent}"/>
  </g>`;
}
function monitor(x, y, w, h) {
  let bars = '';
  const n = 26;
  for (let i = 0; i < n; i++) {
    const bh = 10 + Math.abs(Math.sin(i * .7) * Math.cos(i * .23)) * h * .32;
    bars += `<rect x="${x + 30 + i * (w - 60) / n}" y="${y + h * .62 - bh / 2}" width="${(w - 60) / n * .55}" height="${bh}" rx="3" fill="${C.accent}" opacity="${.5 + .5 * Math.sin(i * .3) ** 2}"/>`;
  }
  return `<g>
    <rect x="${x + w / 2 - 14}" y="${y + h}" width="28" height="60" fill="${C.ink}"/>
    <ellipse cx="${x + w / 2}" cy="${y + h + 62}" rx="70" ry="10" fill="${C.ink}"/>
    <rect x="${x - 10}" y="${y - 10}" width="${w + 20}" height="${h + 20}" rx="16" fill="${C.ink}"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="url(#screen)"/>
    <rect x="${x + 24}" y="${y + 22}" width="${w * .3}" height="10" rx="5" fill="${C.cream}" opacity=".7"/>
    <rect x="${x + 24}" y="${y + 42}" width="${w * .18}" height="8" rx="4" fill="${C.taupe}" opacity=".6"/>
    <circle cx="${x + w - 30}" cy="${y + 30}" r="8" fill="${C.accent}"/>
    ${bars}
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${C.accent}" opacity=".08"/>
  </g>`;
}
function chair(cx, top, scale = 1, flip = false) {
  const s = scale;
  return `<g transform="translate(${cx} ${top}) scale(${flip ? -s : s} ${s})">
    <!-- base -->
    <rect x="-10" y="330" width="20" height="120" fill="${C.ink}"/>
    <path d="M-110 470 L 0 440 L 110 470" fill="none" stroke="${C.ink}" stroke-width="14" stroke-linecap="round"/>
    <ellipse cx="0" cy="478" rx="120" ry="12" fill="${C.ink}" opacity=".5"/>
    <!-- back -->
    <g transform="rotate(-10 0 150)">
      <rect x="-100" y="0" width="190" height="300" rx="70" fill="url(#matte)"/>
      <rect x="-78" y="24" width="146" height="240" rx="52" fill="url(#seatC)"/>
      <rect x="40" y="20" width="12" height="240" rx="6" fill="${C.accent}" opacity=".35" filter="url(#softS)"/>
    </g>
    <!-- seat -->
    <rect x="-130" y="280" width="260" height="70" rx="30" fill="url(#matte)"/>
    <rect x="-112" y="282" width="224" height="36" rx="18" fill="url(#seatC)"/>
    <!-- arm -->
    <rect x="-140" y="230" width="60" height="110" rx="26" fill="${C.ink}"/>
  </g>`;
}
function smallMic(x, y, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <rect x="-4" y="0" width="8" height="70" fill="${C.ink}"/>
    <ellipse cx="0" cy="72" rx="34" ry="7" fill="${C.ink}"/>
    <rect x="-20" y="-70" width="40" height="80" rx="20" fill="url(#mesh)"/>
    <rect x="-22" y="-8" width="44" height="10" rx="4" fill="${C.accent}"/>
  </g>`;
}
function lamp(x, cordTo, w = 120) {
  return `<g>
    <line x1="${x}" y1="0" x2="${x}" y2="${cordTo}" stroke="${C.ink}" stroke-width="4"/>
    <ellipse cx="${x}" cy="${cordTo + 70}" rx="${w * 1.8}" ry="${w * 1.2}" fill="${C.cream}" opacity=".10" filter="url(#bloom)"/>
    <path d="M${x - w / 2} ${cordTo + 56} Q ${x} ${cordTo - 20} ${x + w / 2} ${cordTo + 56} Z" fill="${C.ink}"/>
    <path d="M${x - w / 2 + 6} ${cordTo + 52} Q ${x} ${cordTo + 70} ${x + w / 2 - 6} ${cordTo + 52}" fill="none" stroke="#ffd2b8" stroke-width="6"/>
    <ellipse cx="${x}" cy="${cordTo + 58}" rx="${w / 2 - 8}" ry="8" fill="${C.cream}" opacity=".9"/>
  </g>`;
}
const sceneDefs = `
<defs>
  <linearGradient id="wall" x1="0" x2="0" y1="0" y2="1">
    <stop offset="0" stop-color="#2a2522"/><stop offset="1" stop-color="${C.ink}"/>
  </linearGradient>
  <pattern id="foamP" width="20" height="20" patternUnits="userSpaceOnUse">
    <rect width="10" height="20" fill="${C.taupeD}"/><rect x="10" width="10" height="20" fill="#6f645b"/>
    <rect x="8" width="4" height="20" fill="${C.taupe}" opacity=".6"/>
  </pattern>
  <radialGradient id="foamShade" cx=".3" cy=".2" r="1">
    <stop offset="0" stop-color="${C.accent}" stop-opacity=".12"/><stop offset=".6" stop-color="${C.ink}" stop-opacity=".25"/><stop offset="1" stop-color="${C.ink}" stop-opacity=".6"/>
  </radialGradient>
  <linearGradient id="deskTop" x1="0" x2="0" y1="0" y2="1">
    <stop offset="0" stop-color="${C.taupe}"/><stop offset="1" stop-color="${C.taupeD}"/>
  </linearGradient>
  <linearGradient id="deskFront" x1="0" x2="0" y1="0" y2="1">
    <stop offset="0" stop-color="#3a3430"/><stop offset="1" stop-color="${C.ink}"/>
  </linearGradient>
  <linearGradient id="screen" x1="0" x2="1" y1="0" y2="1">
    <stop offset="0" stop-color="#2e2824"/><stop offset="1" stop-color="${C.ink}"/>
  </linearGradient>
  <linearGradient id="seatC" x1="0" x2="1">
    <stop offset="0" stop-color="${C.taupe}"/><stop offset="1" stop-color="${C.taupeD}"/>
  </linearGradient>
  <linearGradient id="floor" x1="0" x2="0" y1="0" y2="1">
    <stop offset="0" stop-color="#2a2522"/><stop offset="1" stop-color="#151311"/>
  </linearGradient>
  <radialGradient id="vign" cx=".5" cy=".45" r=".75">
    <stop offset=".55" stop-color="${C.ink}" stop-opacity="0"/><stop offset="1" stop-color="${C.ink}" stop-opacity=".75"/>
  </radialGradient>
</defs>`;

function studio(W, H, L, opts = {}) {
  const deskTop = `${L.desk.x1 + 60},${L.desk.top} ${L.desk.x2 - 60},${L.desk.top} ${L.desk.x2},${L.desk.top + L.desk.depth} ${L.desk.x1},${L.desk.top + L.desk.depth}`;
  const fy = L.desk.top + L.desk.depth;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${defs}${sceneDefs}${signDefs}
  <!-- far wall, softly out of focus -->
  <g filter="url(#blurFar)">
    <rect width="${W}" height="${L.floorY}" fill="url(#wall)"/>
    <ellipse cx="${L.sign.x}" cy="${L.sign.y}" rx="${W * .38}" ry="${H * .26}" fill="${C.accent}" opacity=".22" filter="url(#bloom)"/>
    ${L.foam.map(f => foam(...f)).join('')}
    ${L.stripes ? `<rect x="0" y="${L.floorY - 60}" width="${W}" height="6" fill="${C.taupeD}" opacity=".5"/>` : ''}
    ${opts.noSign ? '' : `<g transform="translate(${L.sign.x - L.sign.w / 2} ${L.sign.y - L.sign.w * .5}) scale(${L.sign.w / 1024})">${signG(true)}</g>`}
    ${L.clock ? clock(...L.clock) : ''}
  </g>
  <filter id="blurFar"><feGaussianBlur stdDeviation="${L.blur || 2.2}"/></filter>
  <!-- floor -->
  <rect y="${L.floorY}" width="${W}" height="${H - L.floorY}" fill="url(#floor)"/>
  <ellipse cx="${W / 2}" cy="${L.floorY + (H - L.floorY) * .55}" rx="${W * .42}" ry="${(H - L.floorY) * .3}" fill="${C.taupeD}" opacity=".18"/>
  ${L.lamps.map(l => lamp(...l)).join('')}
  ${L.chairs.map(c => chair(...c)).join('')}
  <!-- desk -->
  ${L.monitor ? monitor(...L.monitor) : ''}
  ${L.smallMics.map(m => smallMic(...m)).join('')}
  <polygon points="${deskTop}" fill="url(#deskTop)"/>
  <rect x="${L.desk.x1}" y="${fy}" width="${L.desk.x2 - L.desk.x1}" height="${L.desk.front}" fill="url(#deskFront)"/>
  <rect x="${L.desk.x1}" y="${fy + 14}" width="${L.desk.x2 - L.desk.x1}" height="5" fill="${C.accent}"/>
  <rect x="${L.desk.x1}" y="${fy + 6}" width="${L.desk.x2 - L.desk.x1}" height="24" fill="${C.accent}" opacity=".45" filter="url(#softS)"/>
  <ellipse cx="${(L.desk.x1 + L.desk.x2) / 2}" cy="${fy + L.desk.front + 18}" rx="${(L.desk.x2 - L.desk.x1) * .55}" ry="22" fill="#000" opacity=".35" filter="url(#softS)"/>
  ${opts.extra || ''}
  <rect width="${W}" height="${H}" fill="url(#vign)"/>
  <rect width="${W}" height="${H}" filter="url(#noise)" opacity=".18"/>
</svg>`;
}

const L169 = {
  floorY: 860,
  sign: { x: 960, y: 175, w: 380 },
  foam: [[110, 170, 4, 3], [1120, 300, 3, 2]],
  clock: [1640, 210, 88],
  lamps: [[700, 60, 110], [1220, 60, 110]],
  chairs: [[260, 420, 1, false], [1660, 420, 1, true]],
  monitor: [610, 470, 330, 196],
  smallMics: [[1090, 628, 1], [470, 640, .9]],
  desk: { x1: 330, x2: 1590, top: 698, depth: 62, front: 170 },
  stripes: true,
};
const L916 = {
  floorY: 1330,
  sign: { x: 540, y: 300, w: 470 },
  foam: [[70, 560, 4, 3]],
  clock: [868, 650, 92],
  lamps: [[300, 40, 100], [800, 40, 100]],
  chairs: [[110, 930, 1.05, false], [975, 930, 1.05, true]],
  monitor: [330, 960, 320, 186],
  smallMics: [[760, 1130, 1]],
  desk: { x1: 120, x2: 960, top: 1232, depth: 64, front: 220 },
  stripes: true,
  blur: 2,
};

function wrap(svg, transparent) {
  return `<!doctype html><html><head>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Nunito:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>html,body{margin:0;background:${transparent ? 'transparent' : C.ink}}svg{display:block}</style></head><body>${svg}</body></html>`;
}
const box = (inner, size = 1024, extraDefs = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">${defs}${signDefs}${extraDefs}${inner}</svg>`;

function erp() {
  const tiles = [
    [250, 300, 1.0, -14], [770, 260, .9, 12], [840, 640, 1.05, -8], [520, 820, .85, 6], [180, 690, .95, 10], [520, 160, .7, -4], [930, 450, .6, 18], [110, 470, .62, -20],
  ];
  const core = [512, 500];
  const lines = tiles.map(([x, y]) => `<line x1="${core[0]}" y1="${core[1]}" x2="${x}" y2="${y}" stroke="${C.accent}" stroke-width="2.5" opacity=".55"/><line x1="${core[0]}" y1="${core[1]}" x2="${x}" y2="${y}" stroke="${C.accent}" stroke-width="10" opacity=".18" filter="url(#softS)"/>`).join('');
  const tile = ([x, y, s, r], i) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})">
    <ellipse cx="10" cy="90" rx="90" ry="16" fill="#000" opacity=".35" filter="url(#softS)"/>
    <rect x="-70" y="-56" width="140" height="124" rx="30" fill="${C.deep}"/>
    <rect x="-70" y="-70" width="140" height="124" rx="30" fill="url(#tileF${i % 3})"/>
    <rect x="-70" y="-70" width="140" height="124" rx="30" fill="none" stroke="${C.cream}" stroke-opacity=".35" stroke-width="2"/>
    <rect x="-40" y="-36" width="${40 + (i * 13) % 30}" height="10" rx="5" fill="${C.cream}" opacity=".8"/>
    <rect x="-40" y="-16" width="${60 + (i * 7) % 20}" height="8" rx="4" fill="${C.cream}" opacity=".4"/>
    <circle cx="36" cy="20" r="12" fill="${C.cream}" opacity=".7"/>
  </g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${defs}
  <defs>
    <radialGradient id="bgE" cx=".5" cy=".48" r=".7"><stop offset="0" stop-color="#3a2a22"/><stop offset=".6" stop-color="${C.ink}"/><stop offset="1" stop-color="#141210"/></radialGradient>
    <radialGradient id="coreG"><stop offset="0" stop-color="${C.cream}"/><stop offset=".25" stop-color="#ffb48f"/><stop offset=".55" stop-color="${C.accent}"/><stop offset=".8" stop-color="${C.deep}"/><stop offset="1" stop-color="${C.deep}" stop-opacity="0"/></radialGradient>
    <linearGradient id="tileF0" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9a68"/><stop offset="1" stop-color="${C.accent}"/></linearGradient>
    <linearGradient id="tileF1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.cream}"/><stop offset="1" stop-color="${C.taupe}"/></linearGradient>
    <linearGradient id="tileF2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a423c"/><stop offset="1" stop-color="${C.ink}"/></linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bgE)"/>
  <ellipse cx="512" cy="500" rx="380" ry="150" fill="none" stroke="${C.taupe}" stroke-opacity=".35" stroke-width="2" transform="rotate(-16 512 500)"/>
  <ellipse cx="512" cy="500" rx="300" ry="330" fill="none" stroke="${C.taupe}" stroke-opacity=".22" stroke-width="2" transform="rotate(24 512 500)"/>
  <ellipse cx="512" cy="500" rx="440" ry="250" fill="none" stroke="${C.accent}" stroke-opacity=".25" stroke-width="2" stroke-dasharray="4 10"/>
  ${lines}
  <circle cx="512" cy="500" r="260" fill="${C.accent}" opacity=".25" filter="url(#bloom)"/>
  <circle cx="512" cy="500" r="120" fill="url(#coreG)"/>
  <circle cx="512" cy="500" r="56" fill="${C.cream}" opacity=".9" filter="url(#softS)"/>
  ${tiles.map(tile).join('')}
  <rect width="1024" height="1024" filter="url(#noise)" opacity=".14"/>
</svg>`;
}

function og() {
  const W = 1200, H = 630;
  const L = {
    floorY: 520, sign: { x: 900, y: 150, w: 300 }, foam: [[620, 270, 3, 2, 80, 10]], clock: [1110, 330, 52],
    lamps: [[760, 30, 80]], chairs: [], monitor: null, smallMics: [], desk: { x1: 560, x2: 1300, top: 470, depth: 40, front: 120 }, blur: 3,
  };
  const extra = `<g transform="translate(760 140) scale(.56)">${micG()}</g>
  <rect width="${W}" height="${H}" fill="url(#ogFade)"/>`;
  return studio(W, H, L, { extra }).replace('</defs>', `<linearGradient id="ogFade" x1="0" x2="1"><stop offset="0" stop-color="${C.ink}"/><stop offset=".42" stop-color="${C.ink}" stop-opacity=".92"/><stop offset=".62" stop-color="${C.ink}" stop-opacity="0"/></linearGradient></defs>`);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const jobs = [
    { name: 'studio-bg-16x9.jpg', w: 1920, h: 1080, svg: studio(1920, 1080, L169) },
    { name: 'studio-bg-9x16.jpg', w: 1080, h: 1920, svg: studio(1080, 1920, L916) },
    { name: 'mic.png', w: 1024, h: 1024, svg: box(micG()), t: true },
    { name: 'headphones.png', w: 1024, h: 1024, svg: box(headG()), t: true },
    { name: 'onair-sign.png', w: 1024, h: 1024, svg: box(signG(true)), t: true },
    { name: 'erp-modules.png', w: 1024, h: 1024, svg: erp() },
    { name: 'og-share.jpg', w: 1200, h: 630, svg: og() },
  ];
  for (const j of jobs) {
    const page = await browser.newPage({ viewport: { width: j.w, height: j.h } });
    await routeFonts(page);
    await page.setContent(wrap(j.svg, j.t), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const isJpg = j.name.endsWith('.jpg');
    await page.screenshot({ path: path.join(OUT, j.name), type: isJpg ? 'jpeg' : 'png', quality: isJpg ? 82 : undefined, omitBackground: !!j.t });
    console.log('wrote', j.name);
    await page.close();
  }
  await browser.close();
})();
