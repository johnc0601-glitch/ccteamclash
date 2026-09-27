import {mkdir, readFile} from 'node:fs/promises';
import sharp from 'sharp';

const sourcePath = 'public/pwa/team-clash-app-icon.svg';
const outputDir = 'public/pwa';
const source = await readFile(sourcePath);

await mkdir(outputDir, {recursive: true});

await Promise.all([
  sharp(source)
    .resize(192, 192, {fit: 'cover'})
    .png()
    .toFile(`${outputDir}/team-clash-app-icon-192.png`),
  sharp(source)
    .resize(512, 512, {fit: 'cover'})
    .png()
    .toFile(`${outputDir}/team-clash-app-icon-512.png`),
  sharp(source)
    .resize(512, 512, {
      fit: 'contain',
      background: '#090b0c',
    })
    .png()
    .toFile(`${outputDir}/team-clash-app-icon-maskable-512.png`),
]);
