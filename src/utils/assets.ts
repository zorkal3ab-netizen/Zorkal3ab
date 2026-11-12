/**
 * Asset URL helper to ensure compatibility across local dev and GitHub Pages base paths.
 */
export function getAssetUrl(path: string | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }

  // Remove leading slash to normalize path
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  // Server-hosted uploaded media files in local dev
  if (cleanPath.startsWith('uploads/')) {
    return '/' + cleanPath;
  }

  const baseUrl = import.meta.env.BASE_URL || './';
  if (baseUrl === './' || baseUrl === '') {
    return cleanPath;
  }
  const prefix = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${prefix}${cleanPath}`;
}

