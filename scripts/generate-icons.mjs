/**
 * Gera os 4 ícones PNG para o PWA Megasena a partir de uma foto fonte.
 * Requer: npm install canvas (já instalado)
 * Uso: node scripts/generate-icons.mjs
 *
 * Coloque a foto fonte em: public/icons/source.jpg (ou .png)
 */
import { createCanvas, loadImage } from 'canvas';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = resolve(__dirname, '../public/icons');

mkdirSync(ICONS_DIR, { recursive: true });

// Procura o arquivo fonte
const POSSIBLE_SOURCES = [
  resolve(ICONS_DIR, 'source.jpg'),
  resolve(ICONS_DIR, 'source.jpeg'),
  resolve(ICONS_DIR, 'source.png'),
];

const sourcePath = POSSIBLE_SOURCES.find(existsSync);

if (!sourcePath) {
  console.error('❌ Arquivo fonte não encontrado!');
  console.error('   Coloque a foto em: public/icons/source.jpg');
  process.exit(1);
}

console.log(`📷 Usando fonte: ${sourcePath}`);
const sourceImage = await loadImage(sourcePath);

/**
 * Recorta um quadrado centralizado da imagem e redimensiona.
 * Para foto de pessoa: foca na parte superior (rosto/torso).
 */
function drawPhotoIcon(size, maskable = false) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const { width: sw, height: sh } = sourceImage;

  // Recorte quadrado: pega a largura total e a mesma altura centralizada
  // Para foto de retrato (vertical), foca na parte superior (pessoa)
  const isPortrait = sh > sw;
  let cropX, cropY, cropSize;

  if (isPortrait) {
    // Foto vertical: recorta quadrado do terço superior (onde fica a pessoa)
    cropSize = sw;
    cropX = 0;
    // Começa em ~10% do topo para focar no rosto/torso
    cropY = Math.max(0, sh * 0.05);
    // Garante que não sai da imagem
    if (cropY + cropSize > sh) cropY = sh - cropSize;
  } else {
    // Foto horizontal: recorta quadrado centralizado
    cropSize = sh;
    cropX = (sw - sh) / 2;
    cropY = 0;
  }

  // Para ícone maskable: adiciona padding de 10% (safe zone)
  const pad = maskable ? size * 0.1 : 0;
  const drawSize = size - pad * 2;

  ctx.drawImage(sourceImage, cropX, cropY, cropSize, cropSize, pad, pad, drawSize, drawSize);

  return canvas.toBuffer('image/png');
}

const configs = [
  { name: 'icon-192.png',          size: 192, maskable: false },
  { name: 'icon-512.png',          size: 512, maskable: false },
  { name: 'icon-192-maskable.png', size: 192, maskable: true  },
  { name: 'icon-512-maskable.png', size: 512, maskable: true  },
];

for (const { name, size, maskable } of configs) {
  const buf = drawPhotoIcon(size, maskable);
  const outPath = resolve(ICONS_DIR, name);
  writeFileSync(outPath, buf);
  console.log(`✅ Gerado: ${name} (${(buf.length / 1024).toFixed(1)} KB)`);
}

console.log('\n🎉 Todos os ícones gerados em public/icons/');
console.log('   Execute: npm run build:ghpages && git add -A && git commit -m "chore: atualiza icones PWA" && git push');
