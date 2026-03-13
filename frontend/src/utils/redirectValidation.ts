export function validateRedirect(
  redirectTo: string | undefined,
): string | undefined {
  if (
    !redirectTo ||
    !redirectTo.startsWith("/") ||
    redirectTo.startsWith("//") ||
    redirectTo.includes(":")
  ) {
    return undefined;
  }
  return redirectTo;
}
