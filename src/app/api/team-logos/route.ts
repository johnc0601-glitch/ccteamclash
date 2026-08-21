import {createClient} from '@/lib/supabase/server';
import {createSlug} from '@/shared/utils/slug';

const MAX_LOGO_SIZE_BYTES = 750_000;
const ALLOWED_LOGO_TYPES = new Set(['image/webp', 'image/png', 'image/jpeg', 'image/svg+xml']);

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');
  const teamId = formData.get('teamId');
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

  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return Response.json({error: 'Sign in to upload a team logo.'}, {status: 401});

  const ownerKey = typeof teamId === 'string' && teamId.trim()
    ? teamId.trim()
    : createSlug(typeof teamName === 'string' ? teamName : file.name) || 'team-logo';
  const extension = file.type === 'image/png' ? 'png'
    : file.type === 'image/jpeg' ? 'jpg'
      : file.type === 'image/svg+xml' ? 'svg'
        : 'webp';
  const path = `teams/${ownerKey}/logo.${extension}`;

  const {error} = await supabase.storage.from('team-logos').upload(path, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: '31536000',
  });
  if (error) return Response.json({error: error.message || 'Logo storage could not save this file.'}, {status: 403});

  const {data} = supabase.storage.from('team-logos').getPublicUrl(path);
  return Response.json({url: data.publicUrl, path});
}
