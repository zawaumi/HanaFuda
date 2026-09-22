/**
 * Returns a same-origin path to redirect to after signing in, or "/" when the
 * value cannot be trusted.
 *
 * A bare startsWith("/") check is not enough: "//evil.example" and "/\evil.example"
 * both pass it, and `new URL(value, origin)` then resolves them to another origin,
 * which turns the redirect into an open redirect.
 */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/")) return "/";
  // Protocol-relative and backslash forms escape the current origin.
  if (value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}
