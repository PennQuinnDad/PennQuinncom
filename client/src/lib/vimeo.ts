const ID_PATTERNS = [
  /vimeo\.com\/manage\/videos\/(\d+)/,
  /player\.vimeo\.com\/video\/(\d+)/,
  /vimeo\.com\/(\d+)/,
];

export function extractVimeoId(input: string): string | null {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;
  for (const pattern of ID_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function vimeoThumbnailUrl(idOrUrl: string): string {
  const id = extractVimeoId(idOrUrl);
  return id ? `https://vumbnail.com/${id}.jpg` : '';
}

export function vimeoEmbedUrl(idOrUrl: string, opts: { autoplay?: boolean } = {}): string {
  const id = extractVimeoId(idOrUrl);
  if (!id) return '';
  const params = new URLSearchParams({ dnt: '1' });
  if (opts.autoplay) params.set('autoplay', '1');
  return `https://player.vimeo.com/video/${id}?${params.toString()}`;
}
