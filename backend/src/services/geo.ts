const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

const CROSSING_MAX_DISTANCE_KM = 0.3;
const CROSSING_MAX_HOURS_APART = 3;

type Ping = { latitude: number; longitude: number; createdAt: Date };

export function findClosestCrossing(
  myPings: Ping[],
  theirPings: Ping[]
): { crossedAt: Date; distanceMeters: number } | null {
  let best: { crossedAt: Date; distanceMeters: number } | null = null;

  for (const mine of myPings) {
    for (const theirs of theirPings) {
      const hoursApart = Math.abs(mine.createdAt.getTime() - theirs.createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursApart > CROSSING_MAX_HOURS_APART) continue;

      const distanceKm = haversineDistanceKm(mine.latitude, mine.longitude, theirs.latitude, theirs.longitude);
      if (distanceKm > CROSSING_MAX_DISTANCE_KM) continue;

      const crossedAt = mine.createdAt > theirs.createdAt ? mine.createdAt : theirs.createdAt;
      if (!best || crossedAt > best.crossedAt) {
        best = { crossedAt, distanceMeters: Math.round(distanceKm * 1000) };
      }
    }
  }

  return best;
}
