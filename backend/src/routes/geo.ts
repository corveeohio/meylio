import { Router } from 'express';

export const geoRouter = Router();

async function searchFrenchCities(query: string): Promise<string[]> {
  try {
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&type=municipality&limit=8`;
    const response = await fetch(url);
    const data = (await response.json()) as {
      features?: { properties?: { city?: string } }[];
    };
    return (data.features ?? []).map((feature) => feature.properties?.city).filter((name): name is string => !!name);
  } catch {
    return [];
  }
}

async function searchWorldCities(query: string): Promise<string[]> {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=fr&format=json`;
    const response = await fetch(url);
    const data = (await response.json()) as {
      results?: { name?: string; country?: string; country_code?: string; feature_code?: string }[];
    };
    return (data.results ?? [])
      .filter((place) => place.name && (place.feature_code ?? '').startsWith('PPL'))
      .map((place) => (place.country_code === 'FR' ? place.name! : `${place.name}, ${place.country ?? ''}`.replace(/, $/, '')));
  } catch {
    return [];
  }
}

geoRouter.get('/search-cities', async (req, res) => {
  const query = (req.query.q as string | undefined)?.trim();
  if (!query) {
    res.json([]);
    return;
  }

  const [french, world] = await Promise.all([searchFrenchCities(query), searchWorldCities(query)]);
  res.json([...new Set([...french, ...world])].slice(0, 8));
});
