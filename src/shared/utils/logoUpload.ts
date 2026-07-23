import {createSlug} from './slug';

const LOGO_SIZE = 256;
const LOGO_QUALITY = 0.86;

type TeamLogoUploadResponse = {
  url?: string;
  error?: string;
};

export async function createTeamLogoDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file.');
  }

  const image = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = LOGO_SIZE;
  canvas.height = LOGO_SIZE;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Logo could not be processed.');
  }

  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = (image.naturalWidth - sourceSize) / 2;
  const sourceY = (image.naturalHeight - sourceSize) / 2;

  context.clearRect(0, 0, LOGO_SIZE, LOGO_SIZE);
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    LOGO_SIZE,
    LOGO_SIZE,
  );

  return canvas.toDataURL('image/webp', LOGO_QUALITY);
}

export async function createTeamLogoUrl(file: File, teamName: string): Promise<string> {
  const dataUrl = await createTeamLogoDataUrl(file);
  const logoBlob = dataUrlToBlob(dataUrl);
  const logoFile = new File([logoBlob], `${createSlug(teamName) || 'team-logo'}.webp`, {
    type: 'image/webp',
  });
  const formData = new FormData();
  formData.set('file', logoFile);
  formData.set('teamName', teamName);

  const response = await fetch('/api/team-logos', {
    method: 'POST',
    body: formData,
  });
  const result = await response.json() as TeamLogoUploadResponse;

  if (!response.ok || !result.url) {
    throw new Error(result.error ?? 'Logo could not be uploaded.');
  }

  return result.url;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Logo could not be loaded.'));
    };
    image.src = objectUrl;
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, encodedData] = dataUrl.split(',');
  const mimeType = header.match(/data:(.*);base64/)?.[1] ?? 'image/webp';
  const binary = window.atob(encodedData);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], {type: mimeType});
}
