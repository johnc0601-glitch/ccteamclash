'use client';

import {RouteError} from '@/components/route-state/RouteError';

export default function CaptainError({
  unstable_retry,
}: {
  error: Error & {digest?: string};
  unstable_retry: () => void;
}) {
  return (
    <RouteError
      backHref="/account"
      backLabel="Open account"
      message="Captain Home could not be loaded. Please try again or review your account status."
      title="Captain Home unavailable"
      unstableRetry={unstable_retry}
    />
  );
}
