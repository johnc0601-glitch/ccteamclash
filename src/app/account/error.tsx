'use client';

import {RouteError} from '@/components/route-state/RouteError';

export default function AccountError({
  unstable_retry,
}: {
  error: Error & {digest?: string};
  unstable_retry: () => void;
}) {
  return (
    <RouteError
      backHref="/"
      backLabel="Return home"
      message="Your account page could not be loaded. Please try again. Your account information has not been changed."
      title="Account unavailable"
      unstableRetry={unstable_retry}
    />
  );
}
