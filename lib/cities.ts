import citiesData from "cities-list";

export interface City {
  name: string;
}

const ALL_CITIES: City[] = Object.keys(
  citiesData as Record<string, number>
).map((name) => ({ name }));

export function searchCities(query: string): City[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return ALL_CITIES.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 50);
}
