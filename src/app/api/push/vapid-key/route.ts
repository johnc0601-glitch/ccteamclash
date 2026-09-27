import {NextResponse} from 'next/server';
import {createPublicClient} from '@/lib/supabase/public';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createPublicClient();
  const {data, error} = await (supabase as any)
    .from('launch_push_config')
    .select('public_key,enabled')
    .eq('id', 'default')
    .maybeSingle();

  const publicKey = typeof data?.public_key === 'string' ? data.public_key.trim() : '';
  if (error || !data?.enabled || !publicKey) {
    return NextResponse.json(
      {enabled: false},
      {status: 503, headers: {'Cache-Control': 'no-store'}},
    );
  }

  return NextResponse.json(
    {enabled: true, publicKey},
    {headers: {'Cache-Control': 'no-store'}},
  );
}
