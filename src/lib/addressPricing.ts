export type RoadAccessCondition = 'normal' | 'ladeira' | 'rua_ruim';

export interface CepLookupResult {
  cep: string;
  streetAddress: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface AddressPriceResult {
  basePrice: number;
  distanceKm: number | null;
  estimatedMinutes: number | null;
  resolvedNeighborhood: string;
  resolvedCity: string;
  source: 'route' | 'calibrated' | 'cep';
  terrainAdjustment: number;
  terrainReasons: string[];
  maxElevationM: number | null;
  elevationDeltaM: number | null;
}

// Ponto de saída: Rua Rio Amazonas, S/N, Bloco 86G, Quadra 2 — Ipsep, Recife - PE
const ORIGIN_COORDS = {
  lat: -8.1136635,
  lon: -34.9176263,
};

const BASE_IPSEP = 250;

export const SUGGESTED_NEIGHBORHOODS = [
  'Ipsep',
  'Ibura de Baixo',
  'Imbiribeira',
  'Areias',
  'Boa Viagem',
  'São José',
  'Afogados',
  'Boa Vista',
  'Pina',
  'Madalena',
  'Torre',
  'Graças',
  'Jardim Jordão',
  'UR-11',
  'Cohab',
  'Piedade',
  'Casa Amarela',
  'Casa Forte',
  'Várzea',
  'Candeias',
  'Barra de Jangada',
  'Prazeres',
  'Olinda - Bairro Novo',
  'Olinda - Casa Caiada',
  'Olinda - Rio Doce',
  'Olinda - Ouro Preto',
  'Camaragibe',
  'Paulista',
  'Cabo de Santo Agostinho',
];

export const SUGGESTED_CITIES = [
  'Recife',
  'Olinda',
  'Jaboatão dos Guararapes',
  'Paulista',
  'Camaragibe',
  'Cabo de Santo Agostinho',
  'São Lourenço da Mata',
  'Abreu e Lima',
  'Igarassu',
  'Moreno',
];

interface CalibratedZone {
  keywords: string[];
  price: number;
  approxKm: number;
}

// Tabela interna calibrada para manter coerência com os valores praticados na região
const CALIBRATED_ZONES: CalibratedZone[] = [
  { keywords: ['ipsep'], price: 250, approxKm: 1.5 },
  {
    keywords: [
      'ibura de baixo',
      'imbiribeira',
      'areias',
      'jordao baixo',
      'estancia',
      'jiquia',
      'caçote',
      'cacote',
    ],
    price: 260,
    approxKm: 4.8,
  },
  {
    keywords: [
      'sao jose',
      'boa viagem',
      'afogados',
      'boa vista',
      'pina',
      'ilha do leite',
      'cabanga',
      'santo antonio',
      'recife antigo',
      'prado',
      'mustardinha',
      'san martin',
      'mangueira',
      'bongui',
      'bongi',
    ],
    price: 270,
    approxKm: 7.8,
  },
  {
    keywords: [
      'madalena',
      'torre',
      'gracas',
      'jardim jordao',
      'espinheiro',
      'tejipio',
      'coqueiral',
      'cordeiro',
      'derby',
      'torroes',
      'engenho do meio',
      'toto',
      'curado',
      'barro',
      'zumbi',
    ],
    price: 280,
    approxKm: 9.2,
  },
  {
    keywords: [
      'ur-11',
      'ur11',
      'ur 11',
      'ur-1',
      'ur-2',
      'ur-3',
      'ur-4',
      'ur-5',
      'ur-6',
      'ur-7',
      'ur-10',
      'cohab',
      'ibura de cima',
      'ibura',
      'piedade',
      'casa amarela',
      'casa forte',
      'parnamirim',
      'tamarineira',
      'encruzilhada',
      'campo grande',
      'arruda',
      'agua fria',
      'iputinga',
      'monteiro',
      'apipucos',
      'caxanga',
    ],
    price: 290,
    approxKm: 10.5,
  },
  {
    keywords: ['barra de jangada', 'prazeres', 'cajueiro seco', 'dois unidos', 'linha do tiro'],
    price: 300,
    approxKm: 12.4,
  },
  {
    keywords: [
      'varzea',
      'candeias',
      'jaboatao',
      'cavaleiro',
      'sucupira',
      'macaxeira',
      'dois irmaos',
      'passarinho',
    ],
    price: 310,
    approxKm: 13.8,
  },
  {
    keywords: ['camaragibe', 'aldeia', 'timbi'],
    price: 340,
    approxKm: 18.2,
  },
  {
    keywords: [
      'olinda',
      'casa caiada',
      'bairro novo',
      'rio doce',
      'ouro preto',
      'peixinhos',
      'jatoba',
      'jardim atlantico',
      'aguas compridas',
      'aguazinha',
      'bultrins',
      'carmo',
      'varadouro',
    ],
    price: 350,
    approxKm: 20.0,
  },
  {
    keywords: ['sao lourenco da mata'],
    price: 360,
    approxKm: 22.5,
  },
  {
    keywords: ['paulista', 'janga', 'pau amarelo', 'maranguape', 'maria farinha'],
    price: 370,
    approxKm: 25.0,
  },
  {
    keywords: ['cabo de santo agostinho', 'pontezinha', 'ponte dos carvalhos'],
    price: 380,
    approxKm: 27.0,
  },
  {
    keywords: ['abreu e lima'],
    price: 390,
    approxKm: 30.0,
  },
  {
    keywords: ['igarassu', 'moreno', 'itapissuma'],
    price: 410,
    approxKm: 34.0,
  },
];

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function priceFromDistanceKm(km: number): number {
  if (km <= 2.3) return BASE_IPSEP;
  if (km <= 5.8) return 260;
  if (km <= 8.5) return 270;
  if (km <= 10.2) return 280;
  if (km <= 12.0) return 290;
  if (km <= 14.5) return 310;
  if (km <= 17.0) return 330;
  if (km <= 21.5) return 350;
  const extra = Math.round(((km - 21.5) * 4.5) / 10) * 10;
  return Math.min(950, 350 + Math.max(10, extra));
}

function matchCalibratedZone(
  neighborhood: string,
  city: string,
  streetAddress: string
): CalibratedZone | null {
  const combined = `${normalizeText(neighborhood)} ${normalizeText(city)} ${normalizeText(streetAddress)}`.trim();
  if (!combined) return null;

  // Priorizar correspondência exata no bairro antes da cidade para não sobrescrever sub-regiões
  const normNeighborhood = normalizeText(neighborhood);
  if (normNeighborhood) {
    for (const zone of CALIBRATED_ZONES) {
      if (zone.keywords.some((kw) => normNeighborhood.includes(kw))) {
        return zone;
      }
    }
  }

  for (const zone of CALIBRATED_ZONES) {
    if (zone.keywords.some((kw) => combined.includes(kw))) {
      return zone;
    }
  }
  return null;
}

function haversineRoadKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const straight = 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  // Fator urbano médio Recife/RMR sobre linha reta
  return Number((straight * 1.34).toFixed(1));
}

export async function lookupCep(rawCep: string): Promise<CepLookupResult | null> {
  const digits = rawCep.replace(/\D/g, '');
  if (digits.length !== 8) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      erro?: boolean;
      cep?: string;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    };
    if (data.erro) return null;
    return {
      cep: data.cep ?? rawCep,
      streetAddress: data.logradouro ?? '',
      neighborhood: data.bairro ?? '',
      city: data.localidade ?? 'Recife',
      state: data.uf ?? 'PE',
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

interface GeocodeMatch {
  lat: number;
  lon: number;
  roadType: string;
  surface: string;
  smoothness: string;
  incline: string;
  displayName: string;
}

async function geocodeAddress(queryText: string): Promise<GeocodeMatch | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&extratags=1&addressdetails=1&countrycodes=br&q=${encodeURIComponent(
      queryText
    )}`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const arr = (await res.json()) as Array<{
      lat?: string;
      lon?: string;
      type?: string;
      display_name?: string;
      extratags?: Record<string, string>;
    }>;
    if (!arr.length || !arr[0].lat || !arr[0].lon) return null;
    const lat = Number(arr[0].lat);
    const lon = Number(arr[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return {
      lat,
      lon,
      roadType: String(arr[0].type ?? '').toLowerCase(),
      surface: String(arr[0].extratags?.surface ?? '').toLowerCase(),
      smoothness: String(arr[0].extratags?.smoothness ?? '').toLowerCase(),
      incline: String(arr[0].extratags?.incline ?? '').toLowerCase(),
      displayName: String(arr[0].display_name ?? ''),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchTerrainMetrics(
  lat: number,
  lon: number
): Promise<{ maxElevationM: number; elevationDeltaM: number } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  const offset = 0.0012; // ~133 metros ao redor do ponto para detectar ladeiras/morros
  const lats = [lat, lat + offset, lat - offset, lat, lat].map((v) => v.toFixed(5));
  const lons = [lon, lon, lon, lon + offset, lon - offset].map((v) => v.toFixed(5));
  try {
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats.join(',')}&longitude=${lons.join(',')}`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as { elevation?: number[] };
    const values = Array.isArray(data.elevation)
      ? data.elevation.filter((n) => typeof n === 'number' && Number.isFinite(n))
      : [];
    if (!values.length) return null;
    const maxElevationM = Math.round(Math.max(...values));
    const minElevationM = Math.round(Math.min(...values));
    return {
      maxElevationM,
      elevationDeltaM: Math.max(0, maxElevationM - minElevationM),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

const HILL_KEYWORDS = [
  'ladeira',
  'morro',
  'alto do',
  'alto da',
  'alto de',
  'alto jose',
  'alto santa',
  'alto sol',
  'alto bela',
  'corrego',
  'subida',
  'sitio historico',
  'ladeira da se',
  'amparo',
  'carmo',
  'jordao alto',
  'ibura de cima',
  'ur-7',
  'bomba do hemeterio',
  'vasco da gama',
  'caixa d\'agua',
  'caixa dagua',
];

const ROUGH_ROAD_KEYWORDS = [
  'beco',
  'viela',
  'escadaria',
  'servidao',
  'estrada de barro',
  'sem asfalto',
  'sem pavimentacao',
];

const UNSMOOTH_SURFACES = new Set([
  'unpaved',
  'dirt',
  'earth',
  'mud',
  'gravel',
  'sand',
  'cobblestone',
  'sett',
  'pebblestone',
  'compacted',
  'grass',
]);

const BAD_SMOOTHNESS = new Set(['bad', 'very_bad', 'horrible', 'very_horrible', 'impassable']);
const NARROW_OR_ROUGH_HIGHWAYS = new Set([
  'track',
  'living_street',
  'service',
  'pedestrian',
  'steps',
  'path',
]);

function computeTerrainAndAccessAdjustment(params: {
  street: string;
  neighborhood: string;
  geo: GeocodeMatch | null;
  terrain: { maxElevationM: number; elevationDeltaM: number } | null;
  accessCondition: RoadAccessCondition;
}): { terrainAdjustment: number; terrainReasons: string[] } {
  const combinedText = `${normalizeText(params.street)} ${normalizeText(
    params.neighborhood
  )} ${normalizeText(params.geo?.displayName ?? '')}`;

  let hillAdjustment = 0;
  let roughAdjustment = 0;
  const reasons: string[] = [];

  if (params.terrain) {
    if (params.terrain.elevationDeltaM >= 22 || params.terrain.maxElevationM >= 52) {
      hillAdjustment = 30;
      reasons.push(
        `Ladeira íngreme/morro (${params.terrain.maxElevationM}m alt., desnível ${params.terrain.elevationDeltaM}m)`
      );
    } else if (
      params.terrain.elevationDeltaM >= 12 ||
      params.terrain.maxElevationM >= 34
    ) {
      hillAdjustment = 20;
      reasons.push(
        `Área de subida/ladeira (${params.terrain.maxElevationM}m alt., desnível ${params.terrain.elevationDeltaM}m)`
      );
    }
  }

  if (hillAdjustment === 0 && HILL_KEYWORDS.some((kw) => combinedText.includes(kw))) {
    hillAdjustment = 20;
    reasons.push('Região ou via em ladeira/alto');
  }

  if (params.geo) {
    if (UNSMOOTH_SURFACES.has(params.geo.surface)) {
      roughAdjustment = 20;
      reasons.push(`Pavimento irregular/sem asfalto (${params.geo.surface})`);
    } else if (BAD_SMOOTHNESS.has(params.geo.smoothness)) {
      roughAdjustment = 20;
      reasons.push('Condição de via irregular no mapa');
    } else if (NARROW_OR_ROUGH_HIGHWAYS.has(params.geo.roadType)) {
      roughAdjustment = 15;
      reasons.push(`Via estreita/acesso local (${params.geo.roadType})`);
    }
    if (params.geo.incline && hillAdjustment === 0) {
      hillAdjustment = 20;
      reasons.push(`Inclinação registrada (${params.geo.incline})`);
    }
  }

  if (
    roughAdjustment === 0 &&
    ROUGH_ROAD_KEYWORDS.some((kw) => combinedText.includes(kw))
  ) {
    roughAdjustment = 20;
    reasons.push('Via estreita ou sem pavimentação');
  }

  if (params.accessCondition === 'ladeira') {
    hillAdjustment = Math.max(hillAdjustment, 20);
    if (!reasons.some((r) => r.toLowerCase().includes('ladeira'))) {
      reasons.push('Ladeira informada no acesso');
    }
  } else if (params.accessCondition === 'rua_ruim') {
    roughAdjustment = Math.max(roughAdjustment, 20);
    if (!reasons.some((r) => r.toLowerCase().includes('pavimento') || r.toLowerCase().includes('via'))) {
      reasons.push('Acesso estreito/irregular informado');
    }
  }

  const totalAdjustment = Math.min(40, hillAdjustment + roughAdjustment);
  return {
    terrainAdjustment: totalAdjustment,
    terrainReasons: reasons,
  };
}

async function fetchDrivingDistance(
  destLat: number,
  destLon: number
): Promise<{ distanceKm: number; minutes: number } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${ORIGIN_COORDS.lon},${ORIGIN_COORDS.lat};${destLon},${destLat}?overview=false`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      code?: string;
      routes?: Array<{ distance?: number; duration?: number }>;
    };
    const route = data.routes?.[0];
    if (!route || typeof route.distance !== 'number') return null;
    return {
      distanceKm: Number((route.distance / 1000).toFixed(1)),
      minutes: Math.max(5, Math.round((route.duration ?? 600) / 60)),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function calculateAddressPrice(input: {
  streetAddress: string;
  neighborhood: string;
  city: string;
  accessCondition?: RoadAccessCondition;
}): Promise<AddressPriceResult | null> {
  const street = input.streetAddress.trim();
  const neighborhood = input.neighborhood.trim();
  const city = input.city.trim() || 'Recife';
  const accessCondition = input.accessCondition ?? 'normal';

  if (!street && !neighborhood && !input.city.trim()) {
    return null;
  }

  const calibrated = matchCalibratedZone(neighborhood, city, street);

  const candidates = [
    street && neighborhood
      ? `${street}, ${neighborhood}, ${city}, Pernambuco, Brasil`
      : '',
    neighborhood ? `${neighborhood}, ${city}, Pernambuco, Brasil` : '',
    street ? `${street}, ${city}, Pernambuco, Brasil` : '',
    `${city}, Pernambuco, Brasil`,
  ].filter(Boolean);

  let geo: GeocodeMatch | null = null;
  for (const q of candidates) {
    geo = await geocodeAddress(q);
    if (geo) break;
  }

  if (geo) {
    const [driving, terrain] = await Promise.all([
      fetchDrivingDistance(geo.lat, geo.lon),
      fetchTerrainMetrics(geo.lat, geo.lon),
    ]);
    const distanceKm =
      driving?.distanceKm ??
      haversineRoadKm(ORIGIN_COORDS.lat, ORIGIN_COORDS.lon, geo.lat, geo.lon);
    const routePrice = priceFromDistanceKm(distanceKm);
    const { terrainAdjustment, terrainReasons } = computeTerrainAndAccessAdjustment({
      street,
      neighborhood,
      geo,
      terrain,
      accessCondition,
    });

    const baseFromDistance = calibrated ? calibrated.price : routePrice;
    return {
      basePrice: baseFromDistance + terrainAdjustment,
      distanceKm,
      estimatedMinutes: driving?.minutes ?? Math.max(8, Math.round(distanceKm * 2.4)),
      resolvedNeighborhood: neighborhood || city,
      resolvedCity: city,
      source: 'route',
      terrainAdjustment,
      terrainReasons,
      maxElevationM: terrain?.maxElevationM ?? null,
      elevationDeltaM: terrain?.elevationDeltaM ?? null,
    };
  }

  const { terrainAdjustment, terrainReasons } = computeTerrainAndAccessAdjustment({
    street,
    neighborhood,
    geo: null,
    terrain: null,
    accessCondition,
  });

  if (calibrated) {
    return {
      basePrice: calibrated.price + terrainAdjustment,
      distanceKm: calibrated.approxKm,
      estimatedMinutes: Math.max(8, Math.round(calibrated.approxKm * 2.4)),
      resolvedNeighborhood: neighborhood || city,
      resolvedCity: city,
      source: 'calibrated',
      terrainAdjustment,
      terrainReasons,
      maxElevationM: null,
      elevationDeltaM: null,
    };
  }

  // Fallback seguro para endereços desconhecidos dentro de Recife
  return {
    basePrice: 280 + terrainAdjustment,
    distanceKm: null,
    estimatedMinutes: null,
    resolvedNeighborhood: neighborhood || city,
    resolvedCity: city,
    source: 'cep',
    terrainAdjustment,
    terrainReasons,
    maxElevationM: null,
    elevationDeltaM: null,
  };
}
