export type SearchProfileForAdapter = {
  id: string;
  locations: string[] | null;
  budget_min: number;
  budget_max: number;
  year_min: number;
  mileage_max: number;
  fuel: string;
  preferred_brands: string[] | null;
  acceptable_brands: string[] | null;
  transmission_preference: string;
  max_results?: number | null;
};

export type NormalizedVehicleCandidate = {
  source: 'MercadoLibre';
  sourceListingId: string;
  normalizedHash: string;
  url: string;
  title: string;
  brand: string | null;
  model: string | null;
  trim: string | null;
  price: number | null;
  year: number | null;
  mileage: number | null;
  transmission: string | null;
  fuel: string | null;
  city: string | null;
  sellerType: string | null;
  photoUrl: string | null;
  rawPayload: unknown;
};

type MercadoLibreAttribute = {
  id?: string;
  name?: string;
  value_id?: string | null;
  value_name?: string | null;
};

type MercadoLibreResult = {
  id: string;
  title: string;
  permalink: string;
  price?: number | null;
  thumbnail?: string | null;
  domain_id?: string | null;
  category_id?: string | null;
  official_store_id?: number | null;
  attributes?: MercadoLibreAttribute[] | null;
  address?: {
    state_name?: string | null;
    city_name?: string | null;
  } | null;
};

type MercadoLibreSearchResponse = {
  results?: MercadoLibreResult[];
};

const SITE_ID = 'MCO';
const BASE_URL = `https://api.mercadolibre.com/sites/${SITE_ID}/search`;
const DEFAULT_LIMIT = 50;

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function buildSearchQueries(profile: SearchProfileForAdapter) {
  const preferred = (profile.preferred_brands ?? []).filter(Boolean);
  const acceptable = (profile.acceptable_brands ?? []).filter(Boolean);
  const brands = unique([...preferred, ...acceptable]).slice(0, 5);
  const locations = (profile.locations ?? []).filter(Boolean).slice(0, 3);

  const queries: string[] = [];

  if (brands.length > 0 && locations.length > 0) {
    for (const brand of brands) {
      for (const location of locations) {
        queries.push(`${brand} ${location}`);
      }
    }
  }

  if (brands.length > 0 && locations.length === 0) {
    for (const brand of brands) queries.push(brand);
  }

  if (brands.length === 0 && locations.length > 0) {
    for (const location of locations) queries.push(location);
  }

  if (queries.length === 0) {
    queries.push('carros usados colombia');
  }

  return unique(queries).slice(0, 8);
}

function getAttribute(attributes: MercadoLibreAttribute[] | null | undefined, ...ids: string[]) {
  if (!attributes) return null;
  const wanted = ids.map((id) => id.toUpperCase());
  const match = attributes.find((attr) => attr.id && wanted.includes(attr.id.toUpperCase()));
  return match?.value_name ?? null;
}

function extractNumber(value: string | null | undefined) {
  if (!value) return null;
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}

function titleCaseFallback(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function inferBrandFromTitle(title: string) {
  const normalized = normalizeText(title);
  if (normalized.includes('renault')) return 'Renault';
  if (normalized.includes('kia')) return 'Kia';
  if (normalized.includes('suzuki')) return 'Suzuki';
  if (normalized.includes('chevrolet')) return 'Chevrolet';
  if (normalized.includes('hyundai')) return 'Hyundai';
  return null;
}

function inferModelFromTitle(title: string) {
  const normalized = normalizeText(title);
  if (normalized.includes('stepway')) return 'Stepway';
  if (normalized.includes('sandero')) return 'Sandero';
  if (normalized.includes('picanto')) return 'Picanto';
  if (normalized.includes('swift dzire')) return 'Swift Dzire';
  if (normalized.includes('swift')) return 'Swift';
  if (normalized.includes('kwid')) return 'Kwid';
  if (normalized.includes('logan')) return 'Logan';
  return null;
}

function inferTransmission(attributes: MercadoLibreAttribute[] | null | undefined, title: string) {
  const fromAttributes =
    getAttribute(attributes, 'TRANSMISSION_CONTROL_TYPE', 'TRANSMISSION', 'VEHICLE_TRANSMISSION') ??
    getAttribute(attributes, 'GEARBOX', 'GEAR_NUMBER');

  const source = normalizeText(fromAttributes ?? title);
  if (source.includes('auto')) return 'Automatic';
  if (source.includes('mecan') || source.includes('manual') || source.includes('sincron')) return 'Manual';
  return titleCaseFallback(fromAttributes);
}

function inferFuel(attributes: MercadoLibreAttribute[] | null | undefined, title: string) {
  const fromAttributes = getAttribute(attributes, 'FUEL_TYPE', 'FUEL', 'COMBUSTIBLE');
  const source = normalizeText(fromAttributes ?? title);
  if (source.includes('gas')) return 'Gasoline';
  if (source.includes('diesel')) return 'Diesel';
  if (source.includes('hibr')) return 'Hybrid';
  if (source.includes('electr')) return 'Electric';
  return titleCaseFallback(fromAttributes);
}

function keepVehicleResult(result: MercadoLibreResult) {
  const domain = normalizeText(result.domain_id ?? '');
  const category = normalizeText(result.category_id ?? '');
  const title = normalizeText(result.title);
  if (domain.includes('cars') || domain.includes('vans')) return true;
  if (category.includes('car')) return true;
  return /(sandero|stepway|picanto|swift|kwid|logan|duster|captur|chevrolet|renault|kia|suzuki)/.test(title);
}

function normalizeResult(result: MercadoLibreResult): NormalizedVehicleCandidate {
  const brand = getAttribute(result.attributes, 'BRAND') ?? inferBrandFromTitle(result.title);
  const model =
    getAttribute(result.attributes, 'MODEL', 'CAR_AND_VAN_MODEL') ??
    inferModelFromTitle(result.title);
  const trim =
    getAttribute(result.attributes, 'SHORT_VERSION', 'VERSION', 'CAR_AND_VAN_SUBMODEL') ??
    null;
  const year = extractNumber(getAttribute(result.attributes, 'YEAR', 'VEHICLE_YEAR'));
  const mileage = extractNumber(getAttribute(result.attributes, 'KILOMETERS', 'KM', 'KMS'));
  const transmission = inferTransmission(result.attributes, result.title);
  const fuel = inferFuel(result.attributes, result.title);
  const city = result.address?.city_name ?? result.address?.state_name ?? null;

  return {
    source: 'MercadoLibre',
    sourceListingId: result.id,
    normalizedHash: `mercadolibre:${result.id}`,
    url: result.permalink,
    title: result.title,
    brand,
    model,
    trim,
    price: typeof result.price === 'number' ? result.price : null,
    year,
    mileage,
    transmission,
    fuel,
    city,
    sellerType: result.official_store_id ? 'Dealer' : 'Marketplace',
    photoUrl: result.thumbnail ?? null,
    rawPayload: result
  };
}

async function fetchMercadoLibreQuery(query: string) {
  const url = new URL(BASE_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('limit', String(DEFAULT_LIMIT));

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'car-app-barranquilla/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`MercadoLibre search failed for "${query}" with HTTP ${response.status}`);
  }

  const json = (await response.json()) as MercadoLibreSearchResponse;
  return json.results ?? [];
}

export async function searchMercadoLibreVehicles(profile: SearchProfileForAdapter) {
  const queries = buildSearchQueries(profile);
  const failures: string[] = [];
  const normalized = new Map<string, NormalizedVehicleCandidate>();
  let rawResultCount = 0;

  for (const query of queries) {
    try {
      const results = await fetchMercadoLibreQuery(query);
      rawResultCount += results.length;
      for (const result of results) {
        if (!keepVehicleResult(result)) continue;
        const item = normalizeResult(result);
        normalized.set(item.sourceListingId, item);
      }
    } catch (error) {
      failures.push(error instanceof Error ? error.message : `Query failed for ${query}`);
    }
  }

  return {
    candidates: Array.from(normalized.values()),
    summary: {
      source: 'MercadoLibre',
      siteId: SITE_ID,
      attemptedQueries: queries,
      attemptedCount: queries.length,
      successfulCount: queries.length - failures.length,
      failedCount: failures.length,
      rawResultCount,
      normalizedCount: normalized.size,
      failures
    }
  };
}
