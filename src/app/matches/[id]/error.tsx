'use client';

import {RouteError} from '@/components/route-state/RouteError';

export default function MatchError({
  unstable_retry,
}: {
  error: Error & {digest?: string};
  unstable_retry: () => void;
}) {
  return (
    <RouteError
      backHref="/schedule"
      backLabel="Return to schedule"
      message="The match page could not be loaded. Please try again. If the problem continues, return to the schedule."
      title="Match unavailable"
      unstableRetry={unstable_retry}
    />
  );
}
