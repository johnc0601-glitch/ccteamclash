import {createClient} from '@/lib/supabase/server';
import {createSlug} from '@/shared/utils';

const MAX_STORY_IMAGE_SIZE_BYTES = 3_000_000;
const ALLOWED_STORY_IMAGE_TYPES = new Set(['image/webp', 'image/png', 'image/jpeg']);

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');
  const title = formData.get('title');

  if (!(file instanceof File)) return Response.json({error: 'Choose an image file.'}, {status: 400});
  if (!ALLOWED_STORY_IMAGE_TYPES.has(file.type)) return Response.json({error: 'Choose a PNG, JPG, or WebP image.'}, {status: 400});
  if (file.size > MAX_STORY_IMAGE_SIZE_BYTES) return Response.json({error: 'Story photo is too large.'}, {status: 400});

  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return Response.json({error: 'Sign in to upload a story photo.'}, {status: 401});

  const storySlug = createSlug(typeof title === 'string' ? title : file.name) || 'story-photo';
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/jpeg' ? 'jpg' : 'webp';
  const path = `stories/${storySlug}.${extension}`;
  const {error} = await supabase.storage.from('story-images').upload(path, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: '31536000',
  });
  if (error) return Response.json({error: error.message || 'Story photo storage could not save this file.'}, {status: 403});

  const {data} = supabase.storage.from('story-images').getPublicUrl(path);
  return Response.json({url: data.publicUrl, path});
}
