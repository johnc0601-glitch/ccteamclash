import {put} from '@vercel/blob';
import {createSlug} from '@/shared/utils/slug';

const MAX_COURSE_PHOTO_SIZE_BYTES = 2_000_000;
const ALLOWED_COURSE_PHOTO_TYPES = new Set(['image/webp', 'image/png', 'image/jpeg']);

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({error: 'Course photo storage is not connected yet.'}, {status: 503});
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const courseName = formData.get('courseName');

  if (!(file instanceof File)) {
    return Response.json({error: 'Choose an image file.'}, {status: 400});
  }

  if (!ALLOWED_COURSE_PHOTO_TYPES.has(file.type)) {
    return Response.json({error: 'Choose a PNG, JPG, or WebP image.'}, {status: 400});
  }

  if (file.size > MAX_COURSE_PHOTO_SIZE_BYTES) {
    return Response.json({error: 'Course photo is too large.'}, {status: 400});
  }

  const courseSlug = createSlug(typeof courseName === 'string' ? courseName : file.name) || 'course-photo';

  try {
    const blob = await put(`course-photos/${courseSlug}.webp`, file, {
      access: 'public',
      allowOverwrite: true,
      cacheControlMaxAge: 31536000,
      contentType: file.type,
    });

    return Response.json({url: blob.url});
  } catch {
    return Response.json({error: 'Course photo storage could not save this file.'}, {status: 502});
  }
}
