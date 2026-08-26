import {GET as runHistoricalCiAudit} from '@/app/api/internal/historical-ci-full-audit/route';

export const dynamic = 'force-static';
export const revalidate = false;

export default async function InternalCiBuildAuditPage() {
  if (process.env.VERCEL_ENV === 'production') {
    return null;
  }

  const response = await runHistoricalCiAudit();
  const report = await response.text();
  console.log(`HISTORICAL_CI_FULL_AUDIT=${report}`);

  return <pre>{report}</pre>;
}
