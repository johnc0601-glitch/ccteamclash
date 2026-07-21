import {put} from '@vercel/blob';
import {createSlug} from '@/shared/utils';

const MAX_STORY_IMAGE_SIZE_BYTES = 3_000_000;
const ALLOWED_STORY_IMAGE_TYPES = new Set(['image/webp', 'image/png', 'image/jpeg']);

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({error: 'Story photo storage is not connected yet.'}, {status: 503});
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const title = formData.get('title');

  if (!(file instanceof File)) {
    return Response.json({error: 'Choose an image file.'}, {status: 400});
  }

  if (!ALLOWED_STORY_IMAGE_TYPES.has(file.type)) {
    return Response.json({error: 'Choose a PNG, JPG, or WebP image.'}, {status: 400});
  }

  if (file.size > MAX_STORY_IMAGE_SIZE_BYTES) {
    return Response.json({error: 'Story photo is too large.'}, {status: 400});
  }

  const storySlug = createSlug(typeof title === 'string' ? title : file.name) || 'story-photo';
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/jpeg' ? 'jpg' : 'webp';

  try {
    const blob = await put(`story-images/${storySlug}.${extension}`, file, {
      access: 'public',
      allowOverwrite: true,
      cacheControlMaxAge: 31536000,
      contentType: file.type,
    });

    return Response.json({url: blob.url});
  } catch {
    return Response.json({error: 'Story photo storage could not save this file.'}, {status: 502});
  }
}
