/**
 * Gera os 4 ícones PNG para o PWA Megasena usando apenas APIs nativas.
 * Requer: npm install canvas
 * Uso: node scripts/generate-icons.mjs
 */
import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = resolve(__dirname, '../public/icons');

mkdirSync(ICONS_DIR, { recursive: true });

function drawIcon(size, maskable = false) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Safe zone para maskable: 80% do total
  const pad = maskable ? size * 0.1 : 0;

  // Background
  ctx.fillStyle = '#16a34a';
  ctx.fillRect(0, 0, size, size);

  // Bola (círculo branco)
  const cx = size / 2;
  const cy = size / 2;
  const r = (size / 2 - pad) * 0.55;

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = 'white';
  ctx.fill();

  // Sombra interna sutil
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = size * 0.015;
  ctx.stroke();

  // Texto "MS"
  const fontSize = r * 0.72;
  ctx.fillStyle = '#16a34a';
  ctx.font = `900 ${fontSize}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MS', cx, cy + fontSize * 0.05);

  return canvas.toBuffer('image/png');
}

const configs = [
  { name: 'icon-192.png',          size: 192, maskable: false },
  { name: 'icon-512.png',          size: 512, maskable: false },
  { name: 'icon-192-maskable.png', size: 192, maskable: true  },
  { name: 'icon-512-maskable.png', size: 512, maskable: true  },
];

for (const { name, size, maskable } of configs) {
  const buf = drawIcon(size, maskable);
  const outPath = resolve(ICONS_DIR, name);
  writeFileSync(outPath, buf);
  console.log(`✅ Gerado: ${name} (${buf.length} bytes)`);
}

console.log('\n🎉 Todos os ícones gerados em public/icons/');
