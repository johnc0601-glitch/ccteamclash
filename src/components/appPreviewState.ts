export type AppPreviewState = {
  persisted: boolean;
  enabled: boolean;
};

export function isAppPreviewHost(hostname: string) {
  return hostname.endsWith('.vercel.app')
    || hostname === 'localhost'
    || hostname === '127.0.0.1';
}

export function resolveAppPreviewState({
  hostname,
  queryValue,
  persisted,
  standalone,
  appSurface = false,
}: {
  hostname: string;
  queryValue: string | null;
  persisted: boolean;
  standalone: boolean;
  appSurface?: boolean;
}): AppPreviewState {
  if (appSurface) {
    return {
      persisted: false,
      enabled: true,
    };
  }

  const previewHost = isAppPreviewHost(hostname);
  let nextPersisted = persisted;

  if (previewHost && queryValue === '1') nextPersisted = true;
  if (queryValue === '0') nextPersisted = false;

  return {
    persisted: nextPersisted,
    enabled: previewHost && nextPersisted && !standalone,
  };
}
