import {createPdgaClient} from '@/lib/pdga/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const pdga = await createPdgaClient();
    await pdga.close();
    return Response.json({ok: true});
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'PDGA authentication failed.',
      },
      {status: 500},
    );
  }
}
