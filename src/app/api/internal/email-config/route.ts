import {NextResponse} from 'next/server';
import {isResendConfigured} from '@/lib/email/resend';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({resendConfigured: isResendConfigured()});
}
