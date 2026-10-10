import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const monorepo = existsSync(join(root, 'apps/web'));
const web = join(root, monorepo ? 'apps/web' : 'web');
const mobile = join(root, monorepo ? 'apps/mobile' : 'mobile');
const require = createRequire(join(web, 'package.json'));
const sharp = createRequire(require.resolve('next/package.json'))('sharp');
const product = monorepo ? 'skaddosh' : JSON.parse(readFileSync(join(web, 'package.json'))).name.startsWith('expenn') ? 'Expenn' : 'FreeSolo';
const brand = monorepo ? 'brand/' : '';
const source = join(web, 'public', brand, 'logo.png');
const sourceBuffer = readFileSync(source);
let mark = sourceBuffer;
if (product === 'Expenn') {
  const { width, height } = await sharp(sourceBuffer).metadata();
  const { data, info } = await sharp(sourceBuffer).extract({
    left: Math.round(width * 0.29), top: Math.round(height * 0.20),
    width: Math.round(width * 0.42), height: Math.round(height * 0.42),
  }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245) data[i + 3] = 0;
  }
  mark = await sharp(data, { raw: info }).trim().png().toBuffer();
} else if (product === 'skaddosh') {
  mark = await sharp(sourceBuffer).trim().png().toBuffer();
}
const background = product === 'Expenn' ? '#FFFFFF' : product === 'skaddosh' ? '#FAF7F2' : '#243A46';
async function square(size, padding = 0.12, opaque = false) {
  const artworkSize = Math.round(size * (1 - padding * 2));
  const artwork = await sharp(mark).resize(artworkSize, artworkSize, { fit: 'contain', background: '#00000000' }).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: opaque ? background : '#00000000' } })
    .composite([{ input: artwork, gravity: 'centre' }]).png().toBuffer();
}
const publicDir = join(web, 'public', brand);
const mobileDir = join(mobile, 'assets', brand);
mkdirSync(publicDir, { recursive: true });
mkdirSync(mobileDir, { recursive: true });
writeFileSync(join(publicDir, 'mark.png'), await square(256, 0.04));
for (const size of [16, 32, 48, 192, 512]) writeFileSync(join(publicDir, `icon-${size}.png`), await square(size, 0.08, true));
writeFileSync(join(publicDir, 'apple-touch-icon.png'), await square(180, 0.12, true));
const appIcon = await square(1024, 0.12, true);
let adaptive = await square(1024, 0.22);
if (product === 'FreeSolo') {
  const { data, info } = await sharp(join(publicDir, 'logo-dark.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const brightness = Math.max(data[i], data[i + 1], data[i + 2]);
    data[i + 3] = Math.max(0, Math.min(255, (brightness - 40) * 255 / 60));
  }
  const artwork = await sharp(data, { raw: info }).trim().resize(572, 572, { fit: 'contain', background: '#00000000' }).png().toBuffer();
  adaptive = await sharp({ create: { width: 1024, height: 1024, channels: 4, background: '#00000000' } }).composite([{ input: artwork, gravity: 'centre' }]).png().toBuffer();
}
writeFileSync(join(mobileDir, 'app-icon.png'), appIcon);
writeFileSync(join(mobileDir, 'adaptive-icon-foreground.png'), adaptive);
writeFileSync(join(mobileDir, 'splash-icon.png'), await square(512, 0.12));
writeFileSync(join(mobileDir, 'mark.png'), await square(256, 0.04));
if (!monorepo) {
  writeFileSync(join(web, 'public/icon.png'), await square(192, 0.08, true));
  writeFileSync(join(web, 'app/apple-icon.png'), await square(180, 0.12, true));
  writeFileSync(join(mobileDir, 'favicon.png'), await square(48, 0.08, true));
  const { data, info } = await sharp(adaptive).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) data[i] = data[i + 1] = data[i + 2] = 255;
  const monochrome = await sharp(data, { raw: info }).png().toBuffer();
  writeFileSync(join(mobileDir, 'notification-icon.png'), await sharp(monochrome).resize(96, 96).png().toBuffer());
  writeFileSync(join(mobileDir, 'android-icon-monochrome.png'), monochrome);
  if (product === 'FreeSolo') {
    writeFileSync(join(mobileDir, 'adaptive-icon-foreground-clean.png'), adaptive);
    writeFileSync(join(mobileDir, 'adaptive-icon-background.png'), await sharp({ create: { width: 1024, height: 1024, channels: 3, background } }).png().toBuffer());
    writeFileSync(join(mobileDir, 'android-icon-foreground.png'), adaptive);
    writeFileSync(join(mobileDir, 'android-icon-background.png'), await sharp({ create: { width: 1024, height: 1024, channels: 3, background } }).png().toBuffer());
  } else {
    writeFileSync(join(mobileDir, 'adaptive-icon.png'), appIcon);
  }
}
writeFileSync(join(web, monorepo ? 'src/app/icon.png' : 'app/icon.png'), await square(48, 0.08, true));
const artwork = await sharp(mark).resize(400, 400, { fit: 'contain', background: '#00000000' }).png().toBuffer();
writeFileSync(join(publicDir, 'social-card.png'), await sharp({ create: { width: 1200, height: 630, channels: 3, background } }).composite([{ input: artwork, gravity: 'centre' }]).png().toBuffer());
writeFileSync(join(web, 'public/site.webmanifest'), JSON.stringify({
  name: product, short_name: product, start_url: '/', display: 'standalone', background_color: background, theme_color: background,
  icons: [192, 512].map(size => ({ src: `/${brand}icon-${size}.png`, sizes: `${size}x${size}`, type: 'image/png', purpose: 'any' })),
}, null, 2) + '\n');
console.log(`${product}: generated web and mobile brand assets`);
