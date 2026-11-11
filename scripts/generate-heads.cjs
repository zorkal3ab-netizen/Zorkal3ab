const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

// 1. Generate head-creeper.png (512x512 crisp pixel art Creeper face)
function generateCreeperHead() {
  const size = 512;
  const grid = 8;
  const cellSize = size / grid;

  // 8x8 Creeper Face Grid
  // 'K': Black/charcoal, '1'-'5': Greens
  const map = [
    ['2', '3', '1', '4', '2', '3', '1', '5'],
    ['1', '4', '2', '3', '5', '1', '4', '2'],
    ['3', 'K', 'K', '1', '2', 'K', 'K', '3'],
    ['4', 'K', 'K', '5', '3', 'K', 'K', '4'],
    ['1', '2', 'K', 'K', 'K', 'K', '2', '1'],
    ['5', '3', 'K', 'K', 'K', 'K', '1', '3'],
    ['2', '1', 'K', 'K', 'K', 'K', '5', '2'],
    ['3', '4', 'K', '2', '3', 'K', '4', '1'],
  ];

  const colors = {
    'K': [16, 24, 16, 255],     // Dark Creeper mouth/eyes
    '1': [52, 178, 62, 255],    // Medium Green
    '2': [68, 204, 78, 255],    // Bright Green
    '3': [38, 142, 46, 255],    // Deep Green
    '4': [85, 222, 96, 255],    // Light Lime
    '5': [30, 118, 38, 255],    // Dark Forest
  };

  const png = new PNG({ width: size, height: size });

  for (let y = 0; y < size; y++) {
    const gy = Math.floor(y / cellSize);
    for (let x = 0; x < size; x++) {
      const gx = Math.floor(x / cellSize);
      const code = map[gy][gx];
      const col = colors[code];
      const idx = (size * y + x) << 2;
      png.data[idx] = col[0];
      png.data[idx + 1] = col[1];
      png.data[idx + 2] = col[2];
      png.data[idx + 3] = col[3];
    }
  }

  return PNG.sync.write(png);
}

// 2. Generate head-enderman.png (340x580 Tall Screaming Enderman Head)
function generateEndermanHead() {
  const width = 340;
  const height = 580;
  const png = new PNG({ width, height });

  // Clear with transparent
  for (let i = 0; i < width * height * 4; i += 4) {
    png.data[i + 3] = 0;
  }

  // Draw 3D angled tall Enderman Head
  // Head bounds
  const topY = 40;
  const botY = 540;
  const leftX = 40;
  const rightX = 265;
  const sideRightX = 305; // 3D right side facet

  const jawSplitTop = 185;
  const jawSplitBot = 450;

  for (let y = topY; y <= botY; y++) {
    // 3D perspective slant
    const slantX = Math.round((y - topY) * 0.05);
    const curLeft = leftX + slantX;
    const curRight = rightX + slantX;
    const curSide = sideRightX + slantX;

    for (let x = curLeft; x <= curSide; x++) {
      const idx = (width * y + x) << 2;
      const isSide = x > curRight;

      // Check if in open screaming mouth cavity
      const inMouthY = y > jawSplitTop && y < jawSplitBot;
      let inMouth = false;

      if (inMouthY && !isSide) {
        // Sharp jagged serrated teeth
        const relX = x - curLeft;
        const toothFreq = 0.095;
        const upperTeeth = jawSplitTop + 55 + Math.abs(Math.sin(relX * toothFreq)) * 50;
        const lowerTeeth = jawSplitBot - 55 - Math.abs(Math.sin((relX + 18) * toothFreq)) * 50;

        if (y > upperTeeth && y < lowerTeeth) {
          inMouth = true;
          // Glowing mouth gradient (bright core, intense violet energy)
          const mouthProgressY = (y - (jawSplitTop + jawSplitBot) / 2) / ((jawSplitBot - jawSplitTop) / 2);
          const mouthProgressX = (x - (curLeft + curRight) / 2) / ((curRight - curLeft) / 2);
          const dist = Math.sqrt(mouthProgressX * mouthProgressX * 0.7 + mouthProgressY * mouthProgressY);

          const r = Math.min(255, Math.max(140, Math.round(255 - dist * 90)));
          const g = Math.min(255, Math.max(20, Math.round(220 - dist * 200)));
          const b = Math.min(255, Math.max(200, Math.round(255 - dist * 20)));

          png.data[idx] = r;
          png.data[idx + 1] = g;
          png.data[idx + 2] = b;
          png.data[idx + 3] = 255;
          continue;
        }
      }

      // Base Obsidian / Charcoal head color
      let baseR = 14, baseG = 14, baseB = 20;

      // 3D side is darker
      if (isSide) {
        baseR = 8;
        baseG = 8;
        baseB = 12;
      }

      // Check for Glowing Magenta Eyes on upper head (y between 120 and 160)
      if (y >= 125 && y <= 165 && !isSide) {
        const eye1Left = curLeft + 25;
        const eye1Right = curLeft + 90;
        const eye2Left = curLeft + 125;
        const eye2Right = curLeft + 190;

        if ((x >= eye1Left && x <= eye1Right) || (x >= eye2Left && x <= eye2Right)) {
          // Slanted/aggressive glowing purple eyes
          const eyeProgressY = (y - 125) / 40;
          const slantEye = (x - (x >= eye2Left ? eye2Left : eye1Left)) / 65;
          if (eyeProgressY > 0.15 + slantEye * 0.15 && eyeProgressY < 0.85) {
            // Intense magenta/purple eye
            png.data[idx] = 240;
            png.data[idx + 1] = 60;
            png.data[idx + 2] = 255;
            png.data[idx + 3] = 255;
            continue;
          }
        }
      }

      // Outer edge subtle purple rim highlight
      const isEdge = x <= curLeft + 2 || x >= curSide - 2 || y <= topY + 2 || y >= botY - 2;
      if (isEdge) {
        png.data[idx] = 120;
        png.data[idx + 1] = 50;
        png.data[idx + 2] = 180;
        png.data[idx + 3] = 255;
      } else {
        png.data[idx] = baseR;
        png.data[idx + 1] = baseG;
        png.data[idx + 2] = baseB;
        png.data[idx + 3] = 255;
      }
    }
  }

  return PNG.sync.write(png);
}

const creeperBuf = generateCreeperHead();
const endermanBuf = generateEndermanHead();

const dests = [
  'public/assets/head-creeper.png',
  'public/head-creeper.png',
  'docs/assets/head-creeper.png',
  'docs/head-creeper.png',
  'public/assets/head-enderman.png',
  'public/head-enderman.png',
  'docs/assets/head-enderman.png',
  'docs/head-enderman.png'
];

fs.mkdirSync('public/assets', { recursive: true });
fs.mkdirSync('docs/assets', { recursive: true });

fs.writeFileSync('public/assets/head-creeper.png', creeperBuf);
fs.writeFileSync('public/head-creeper.png', creeperBuf);
fs.writeFileSync('docs/assets/head-creeper.png', creeperBuf);
fs.writeFileSync('docs/head-creeper.png', creeperBuf);

fs.writeFileSync('public/assets/head-enderman.png', endermanBuf);
fs.writeFileSync('public/head-enderman.png', endermanBuf);
fs.writeFileSync('docs/assets/head-enderman.png', endermanBuf);
fs.writeFileSync('docs/head-enderman.png', endermanBuf);

console.log('Successfully generated head-creeper.png and head-enderman.png in all public and docs asset directories!');
