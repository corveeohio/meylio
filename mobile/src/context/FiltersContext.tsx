import { createContext, useContext, useState, type ReactNode } from 'react';

export type DiscoveryFilters = {
  genres: string[];
  minAge: string;
  maxAge: string;
  maxDistanceKm: string;
};

export const EMPTY_FILTERS: DiscoveryFilters = { genres: [], minAge: '', maxAge: '', maxDistanceKm: '' };

type FiltersContextValue = {
  filters: DiscoveryFilters;
  setFilters: (filters: DiscoveryFilters) => void;
};

const FiltersContext = createContext<FiltersContextValue>({
  filters: EMPTY_FILTERS,
  setFilters: () => {},
});

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<DiscoveryFilters>(EMPTY_FILTERS);
  return <FiltersContext.Provider value={{ filters, setFilters }}>{children}</FiltersContext.Provider>;
}

export function useFilters() {
  return useContext(FiltersContext);
}

export function buildDiscoveryQuery(filters: DiscoveryFilters): string {
  const params = new URLSearchParams();
  if (filters.genres.length > 0) params.set('genres', filters.genres.join(','));
  if (filters.minAge) params.set('minAge', filters.minAge);
  if (filters.maxAge) params.set('maxAge', filters.maxAge);
  if (filters.maxDistanceKm) params.set('maxDistanceKm', filters.maxDistanceKm);
  return params.toString();
}
