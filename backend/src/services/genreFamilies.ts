// Spotify ("french hip hop"), Apple Music ("Hip-Hop/Rap") and the manual picker ("Rap FR")
// each name genres differently, so comparing raw strings scores 0 % between sources.
// Every raw genre is mapped to one or more broad families before comparing.

// Keywords starting with "=" only match as a whole word, so "dance" skips "dancehall"
// and "dub" skips "dubstep".
type FamilyRule = { family: string; keywords: string[] };

// Order matters only for display; a genre can belong to several families ("pop rock").
const FAMILY_RULES: FamilyRule[] = [
  { family: 'Rap / Hip-Hop', keywords: ['=rap', 'hip hop', 'hip-hop', 'hiphop', 'trap', 'drill', 'grime', 'pop urbaine'] },
  { family: 'R&B / Soul', keywords: ['r&b', 'rnb', 'r-n-b', 'soul', 'neo soul'] },
  { family: 'K-Pop', keywords: ['k-pop', 'kpop', 'j-pop', 'jpop', 'c-pop'] },
  { family: 'Pop', keywords: ['=pop', 'synthpop', 'electropop', 'popfolk'] },
  { family: 'Indie / Alternatif', keywords: ['indie', 'alternative', 'alternatif', 'shoegaze', 'lo-fi', 'lofi', 'bedroom'] },
  { family: 'Rock', keywords: ['rock', 'grunge', 'britpop'] },
  { family: 'Metal', keywords: ['metal', 'metalcore', 'deathcore', 'hardcore'] },
  { family: 'Punk', keywords: ['punk', '=emo'] },
  {
    family: 'Électro',
    keywords: ['electro', 'électro', 'electronic', 'électronique', 'edm', 'dubstep', 'drum and bass', 'dnb', '=dance', 'house', 'techno', 'trance', 'synthwave', 'ambient'],
  },
  { family: 'Jazz', keywords: ['jazz', 'swing', 'bebop'] },
  { family: 'Blues', keywords: ['blues'] },
  { family: 'Classique', keywords: ['classique', 'classical', 'opera', 'opéra', 'orchestral', 'baroque'] },
  { family: 'Reggae / Dancehall', keywords: ['=reggae', 'dancehall', '=dub', '=ska', 'ragga'] },
  { family: 'Afro / Caribéen', keywords: ['afro', 'amapiano', 'zouk', 'kompa', 'coupé-décalé', 'coupe-decale', 'ndombolo', 'highlife', 'african', 'africaine'] },
  { family: 'Latino', keywords: ['latin', 'latino', 'reggaeton', 'salsa', 'bachata', 'cumbia', 'brazil', 'brésil', 'bossa', 'samba', 'flamenco'] },
  { family: 'Funk / Disco', keywords: ['funk', 'disco', 'groove', 'boogie'] },
  { family: 'Folk / Country', keywords: ['folk', 'country', 'americana', 'bluegrass', 'songwriter', 'auteur-compositeur'] },
  { family: 'Chanson française', keywords: ['chanson', 'variété', 'variete', 'french pop', 'pop française'] },
  { family: 'Bandes originales', keywords: ['soundtrack', 'bande originale', 'film', 'musique de film'] },
  { family: 'Gospel', keywords: ['gospel', 'christian', 'chrétien', 'worship'] },
];

// Catch-all labels Apple Music puts on almost every item: they carry no taste signal.
const IGNORED_GENRES = new Set(['musique', 'music', 'autre', 'other']);

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function genreFamilies(rawGenre: string): string[] {
  const genre = normalize(rawGenre);
  if (!genre || IGNORED_GENRES.has(genre)) return [];

  const words = genre.split(/[^a-z0-9&éèàçû-]+/);
  const matches = (keyword: string) =>
    keyword.startsWith('=') ? words.includes(keyword.slice(1)) : genre.includes(keyword);
  const families = FAMILY_RULES.filter((rule) => rule.keywords.some(matches)).map(
    (rule) => rule.family
  );
  // "k-pop" also contains "pop", but a K-Pop fan is not a generic pop fan.
  if (families.includes('K-Pop')) return families.filter((family) => family !== 'Pop');
  // Unknown genres still match exactly between two people who share them.
  return families.length > 0 ? families : [genre];
}

// Stored in artistStyles when none of a profile's artists is known, so it is not retried.
export const UNKNOWN_STYLE = 'inconnu';

export function toGenreFamilies(rawGenres: string[]): string[] {
  return [...new Set(rawGenres.flatMap(genreFamilies))];
}

export function isMeaningfulGenre(rawGenre: string): boolean {
  return genreFamilies(rawGenre).length > 0;
}

export function normalizeArtistName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/^the /, '')
    .replace(/[^a-z0-9]+/g, '');
}
