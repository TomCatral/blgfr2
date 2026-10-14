/**
 * Utility to sanitize image, avatar, and asset URLs.
 * Converts absolute localhost URLs (e.g. http://localhost:3001/blgflogo.jpg)
 * into root-relative URLs (e.g. /blgflogo.jpg) to prevent Mixed Content
 * errors on HTTPS (Vercel) and allow offline service worker cache hits.
 */
export function sanitizeAssetUrl(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Preserve base64 data URLs and blobs
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Convert http(s)://localhost(:port)/... or http(s)://127.0.0.1(:port)/... or IP/domain to /...
  const cleaned = trimmed.replace(
    /^https?:\/\/(?:localhost|127\.0\.0\.1|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|[a-z0-9.-]+\.vercel\.app)(?::\d+)?\/?/i,
    '/',
  );

  return cleaned;
}
