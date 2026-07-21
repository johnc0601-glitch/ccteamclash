import {put} from '@vercel/blob';
import {createSlug} from '@/shared/utils/slug';

const MAX_LOGO_SIZE_BYTES = 750_000;
const ALLOWED_LOGO_TYPES = new Set(['image/webp', 'image/png', 'image/jpeg', 'image/svg+xml']);

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
    return Response.json({error: 'Logo storage is not connected yet.'}, {status: 503});
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const teamName = formData.get('teamName');

  if (!(file instanceof File)) {
    return Response.json({error: 'Choose an image file.'}, {status: 400});
  }

  if (!ALLOWED_LOGO_TYPES.has(file.type)) {
    return Response.json({error: 'Choose a PNG, JPG, SVG, or WebP image.'}, {status: 400});
  }

  if (file.size > MAX_LOGO_SIZE_BYTES) {
    return Response.json({error: 'Logo file is too large.'}, {status: 400});
  }

  const teamSlug = createSlug(typeof teamName === 'string' ? teamName : file.name) || 'team-logo';
  try {
    const blob = await put(`team-logos/${teamSlug}.webp`, file, {
      access: 'public',
      allowOverwrite: true,
      cacheControlMaxAge: 31536000,
      contentType: file.type,
      storeId: process.env.BLOB_STORE_ID,
    });

    return Response.json({url: blob.url});
  } catch {
    return Response.json({error: 'Logo storage could not save this file.'}, {status: 502});
  }
}
