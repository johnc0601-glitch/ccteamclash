'use client';

import {RouteError} from '@/components/route-state/RouteError';

export default function OfficeError({
  unstable_retry,
}: {
  error: Error & {digest?: string};
  unstable_retry: () => void;
}) {
  return (
    <RouteError
      backHref="/account"
      backLabel="Open account"
      message="The league office could not be loaded. Please try again. No league data has been changed."
      title="League office unavailable"
      unstableRetry={unstable_retry}
    />
  );
}
