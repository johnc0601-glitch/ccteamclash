import sharp from 'sharp';

const MAX_EDGE = 2400;
const THUMB_EDGE = 480;
const WEBP_QUALITY = 82;
const THUMB_QUALITY = 76;
const MATCHDAY_MAX_EDGE = 1800;
const MATCHDAY_QUALITY = 80;

export type ProcessedMediaImage = {
  image: Buffer;
  thumbnail: Buffer;
  mimeType: 'image/webp';
  width: number;
  height: number;
  thumbnailWidth: number;
  thumbnailHeight: number;
  byteSize: number;
};

export type ProcessedMatchdayImage = {
  image: Buffer;
  mimeType: 'image/webp';
  width: number;
  height: number;
  byteSize: number;
};

export async function processMediaImage(file: File): Promise<ProcessedMediaImage> {
  const input = Buffer.from(await file.arrayBuffer());
  const source = sharp(input, {failOn: 'warning'}).rotate();

  const full = await source
    .clone()
    .resize({width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true})
    .webp({quality: WEBP_QUALITY, effort: 4})
    .toBuffer({resolveWithObject: true});

  const thumb = await source
    .clone()
    .resize({width: THUMB_EDGE, height: THUMB_EDGE, fit: 'inside', withoutEnlargement: true})
    .webp({quality: THUMB_QUALITY, effort: 4})
    .toBuffer({resolveWithObject: true});

  if (!full.info.width || !full.info.height || !thumb.info.width || !thumb.info.height) {
    throw new Error('Image dimensions could not be determined.');
  }

  return {
    image: full.data,
    thumbnail: thumb.data,
    mimeType: 'image/webp',
    width: full.info.width,
    height: full.info.height,
    thumbnailWidth: thumb.info.width,
    thumbnailHeight: thumb.info.height,
    byteSize: full.data.byteLength,
  };
}

export async function processMatchdayImage(file: File): Promise<ProcessedMatchdayImage> {
  const input = Buffer.from(await file.arrayBuffer());
  const processed = await sharp(input, {failOn: 'warning'})
    .rotate()
    .resize({width: MATCHDAY_MAX_EDGE, height: MATCHDAY_MAX_EDGE, fit: 'inside', withoutEnlargement: true})
    .webp({quality: MATCHDAY_QUALITY, effort: 4})
    .toBuffer({resolveWithObject: true});

  if (!processed.info.width || !processed.info.height) {
    throw new Error('Image dimensions could not be determined.');
  }

  return {
    image: processed.data,
    mimeType: 'image/webp',
    width: processed.info.width,
    height: processed.info.height,
    byteSize: processed.data.byteLength,
  };
}
