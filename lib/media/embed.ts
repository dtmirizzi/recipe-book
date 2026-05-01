export type EmbedInfo = {
  provider: 'youtube' | 'vimeo';
  embedId: string;
  url: string;       // canonical embed URL (use as iframe src)
  posterUrl: string | null;
};

export function parseEmbedUrl(input: string): EmbedInfo | null {
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, '');

  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    const id = u.searchParams.get('v') ?? u.pathname.match(/\/(?:embed|shorts)\/([\w-]{6,})/)?.[1];
    if (id) {
      return {
        provider: 'youtube',
        embedId: id,
        url: `https://www.youtube.com/embed/${id}`,
        posterUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      };
    }
  }
  if (host === 'youtu.be') {
    const id = u.pathname.replace(/^\//, '').split('/')[0];
    if (id) {
      return {
        provider: 'youtube',
        embedId: id,
        url: `https://www.youtube.com/embed/${id}`,
        posterUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      };
    }
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = u.pathname.match(/(\d{6,})/)?.[1];
    if (id) {
      return {
        provider: 'vimeo',
        embedId: id,
        url: `https://player.vimeo.com/video/${id}`,
        posterUrl: null,
      };
    }
  }
  return null;
}
