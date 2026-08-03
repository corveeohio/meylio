import { Router } from 'express';

export const geoRouter = Router();

geoRouter.get('/search-cities', async (req, res) => {
  const query = (req.query.q as string | undefined)?.trim();
  if (!query) {
    res.json([]);
    return;
  }

  try {
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&type=municipality&limit=8`;
    const response = await fetch(url);
    const data = (await response.json()) as {
      features?: { properties?: { city?: string; postcode?: string } }[];
    };
    const names = (data.features ?? [])
      .map((feature) => feature.properties?.city)
      .filter((name): name is string => !!name);
    const uniqueNames = [...new Set(names)];
    res.json(uniqueNames);
  } catch (error) {
    res.json([]);
  }
});
