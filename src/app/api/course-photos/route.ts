import {createClient} from '@/lib/supabase/server';
import {createSlug} from '@/shared/utils/slug';

const MAX_COURSE_PHOTO_SIZE_BYTES = 2_000_000;
const ALLOWED_COURSE_PHOTO_TYPES = new Set(['image/webp', 'image/png', 'image/jpeg']);

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');
  const courseName = formData.get('courseName');

  if (!(file instanceof File)) return Response.json({error: 'Choose an image file.'}, {status: 400});
  if (!ALLOWED_COURSE_PHOTO_TYPES.has(file.type)) return Response.json({error: 'Choose a PNG, JPG, or WebP image.'}, {status: 400});
  if (file.size > MAX_COURSE_PHOTO_SIZE_BYTES) return Response.json({error: 'Course photo is too large.'}, {status: 400});

  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return Response.json({error: 'Sign in to upload a course photo.'}, {status: 401});

  const courseSlug = createSlug(typeof courseName === 'string' ? courseName : file.name) || 'course-photo';
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/jpeg' ? 'jpg' : 'webp';
  const path = `courses/${courseSlug}.${extension}`;
  const {error} = await supabase.storage.from('course-photos').upload(path, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: '31536000',
  });
  if (error) return Response.json({error: error.message || 'Course photo storage could not save this file.'}, {status: 403});

  const {data} = supabase.storage.from('course-photos').getPublicUrl(path);
  return Response.json({url: data.publicUrl, path});
}
