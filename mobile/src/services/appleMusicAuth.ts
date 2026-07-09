declare global {
  interface Window {
    MusicKit?: any;
  }
}

let scriptLoadingPromise: Promise<void> | null = null;

function loadMusicKitScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('MusicKit JS est disponible uniquement sur web'));
  if (window.MusicKit) return Promise.resolve();
  if (scriptLoadingPromise) return scriptLoadingPromise;

  scriptLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Échec du chargement de MusicKit JS'));
    document.head.appendChild(script);
  });
  return scriptLoadingPromise;
}

type AppleMusicTaste = { topArtists: string[]; topGenres: string[] };

export async function connectAppleMusic(developerToken: string): Promise<AppleMusicTaste> {
  await loadMusicKitScript();
  const MusicKit = window.MusicKit;

  MusicKit.configure({ developerToken, app: { name: 'Meylio', build: '1.0.0' } });
  const music = MusicKit.getInstance();
  await music.authorize();

  const response = await music.api.music('/v1/me/history/heavy-rotation');
  const items = (response.data?.data ?? []) as Array<{
    attributes?: { genreNames?: string[]; artistName?: string };
  }>;

  const topGenres = Array.from(new Set(items.flatMap((item) => item.attributes?.genreNames ?? []))).slice(
    0,
    12
  );
  const topArtists = Array.from(
    new Set(items.map((item) => item.attributes?.artistName).filter((name): name is string => !!name))
  ).slice(0, 20);

  return { topArtists, topGenres };
}
