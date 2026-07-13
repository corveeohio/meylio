const EARTH_RADIUS_KM = 6371;

export function destinationPoint(
  latitude: number,
  longitude: number,
  bearingDeg: number,
  distanceKm: number
): { latitude: number; longitude: number } {
  const bearingRad = (bearingDeg * Math.PI) / 180;
  const latRad = (latitude * Math.PI) / 180;
  const lonRad = (longitude * Math.PI) / 180;
  const angularDistance = distanceKm / EARTH_RADIUS_KM;

  const destLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(angularDistance) +
      Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearingRad)
  );
  const destLonRad =
    lonRad +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(latRad),
      Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(destLatRad)
    );

  return {
    latitude: (destLatRad * 180) / Math.PI,
    longitude: (destLonRad * 180) / Math.PI,
  };
}
