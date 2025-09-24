/*
  Gera ícones PWA (PNG) e favicon.ico a partir do logo transparente.

  Requisitos:
  - npm i -D sharp png-to-ico

  Uso:
  - npm run icons:generate
*/

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pngToIcoLib = require('png-to-ico');
const pngToIco = pngToIcoLib && pngToIcoLib.default ? pngToIcoLib.default : pngToIcoLib;

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function generatePwaIcons(source, outDir) {
  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
  console.log('Gerando ícones PWA...');
  await ensureDir(outDir);

  for (const size of sizes) {
    const outFile = path.join(outDir, `icon-${size}x${size}.png`);
    await sharp(source)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(outFile);
    console.log(`✔ ${path.relative(process.cwd(), outFile)}`);
  }
}

async function generateFavicon(source, outIcoPath) {
  console.log('Gerando favicon.ico...');
  const faviconSizes = [16, 32, 48];
  const pngBuffers = [];

  for (const size of faviconSizes) {
    const buf = await sharp(source)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
    pngBuffers.push(buf);
  }

  const icoBuffer = await pngToIco(pngBuffers);
  await fs.promises.writeFile(outIcoPath, icoBuffer);
  console.log(`✔ ${path.relative(process.cwd(), outIcoPath)}`);
}

async function main() {
  const projectRoot = __dirname;
  const source = path.resolve(projectRoot, 'src/assets/logoAndesTripNoBackground.png');
  const iconsDir = path.resolve(projectRoot, 'src/assets/icons');
  const faviconPath = path.resolve(projectRoot, 'src/favicon.ico');

  if (!fs.existsSync(source)) {
    console.error('✖ Logo fonte não encontrado:', source);
    process.exit(1);
  }

  try {
    await generatePwaIcons(source, iconsDir);
    await generateFavicon(source, faviconPath);
    console.log('✔ Geração concluída com sucesso.');
  } catch (err) {
    console.error('✖ Erro ao gerar ícones:', err);
    process.exit(1);
  }
}

main();

