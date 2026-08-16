const ACCOUNT_JWT_TIMING_RETRY_DELAY_MS = 250;

type PostgrestErrorLike = {
  code?: unknown;
  message?: unknown;
};

export function isTransientJwtTimingError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const {code, message} = error as PostgrestErrorLike;
  return code === 'PGRST303'
    && typeof message === 'string'
    && /jwt\s+issued\s+at\s+future/i.test(message);
}

export async function loadAccountDataWithJwtTimingRetry<T>(
  load: () => Promise<T>,
  wait: (milliseconds: number) => Promise<void> = delay,
): Promise<T> {
  try {
    return await load();
  } catch (error) {
    if (!isTransientJwtTimingError(error)) {
      throw error;
    }

    await wait(ACCOUNT_JWT_TIMING_RETRY_DELAY_MS);
    return load();
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
