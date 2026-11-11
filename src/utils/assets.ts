/**
 * Asset URL helper to ensure compatibility across local dev and GitHub Pages base paths.
 */
export function getAssetUrl(path: string | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  // Server-hosted uploaded media files must keep root path /uploads/...
  if (path.startsWith('/uploads/')) {
    return path;
  }
  if (path.startsWith('uploads/')) {
    return '/' + path;
  }
  // Remove leading slash to make static bundled assets relative for GitHub Pages
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return cleanPath;
}

