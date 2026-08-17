type SignupMetadata = {
  displayName?: unknown;
  name?: unknown;
} | null | undefined;

export function resolveLaunchSignupDisplayName(
  email: string | undefined,
  metadata: SignupMetadata,
): string {
  const displayName = readString(metadata?.displayName);
  if (displayName) return displayName;

  const name = readString(metadata?.name);
  if (name) return name;

  return email?.split('@')[0]?.trim() ?? '';
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
