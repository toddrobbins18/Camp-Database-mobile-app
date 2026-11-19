import { supabase } from './supabase';
import { resolveBundledGeocodeResult, seedGeocodeCacheFromBundled } from './mappointTransportImport';
import {
  geocodeLabelMatchScore,
  isSuspiciousStreetSuffixAddress,
  pickPreferredStreetGeocode,
  sanitizeTransportGeocodeAddress,
  streetSuffixGeocodeCandidates,
} from './transportAddressNormalize';
import {
  loadPersistedGeocodeCache,
  persistGeocodeCache,
  type GeocodeResult,
} from './transportBoardCache';

export type { GeocodeResult };

export type GeocodeProvider = 'ors' | 'nominatim' | 'census';

export const isGeocodePoint = (
  result: GeocodeResult | null,
): result is { lat: number; lng: number; provider?: string; label?: string; correctedAddress?: string } =>
  !!result && 'lat' in result && 'lng' in result;

export const isRetryableGeocodeFailure = (result: GeocodeResult | null) =>
  !!result && 'retryable' in result && result.retryable === true;

export const geocodeFailureMessage = (result: GeocodeResult | null, address: string) =>
  result && 'error' in result
    ? `${result.message || result.error} (${address})`
    : `could not geocode "${address}"`;

export const geocodePayloadToResult = (data: Record<string, unknown> | null | undefined): GeocodeResult | null => {
  if (!data) return null;
  if (typeof data.error === 'string') {
    return {
      error: data.error,
      retryable: data.retryable === true,
      message: typeof data.message === 'string' ? data.message : undefined,
    };
  }
  if (data.found && typeof data.lat === 'number' && typeof data.lng === 'number') {
    return {
      lat: data.lat,
      lng: data.lng,
      provider: data.provider as GeocodeProvider | undefined,
      label: typeof data.label === 'string' ? data.label : undefined,
    };
  }
  return null;
};

export class TransportGeocodeCache {
  private cache: Map<string, GeocodeResult | null> = new Map();
  private loaded = false;

  async init(options?: { useBundledMappoint?: boolean }) {
    if (this.loaded) return;
    this.cache = await loadPersistedGeocodeCache();
    if (options?.useBundledMappoint !== false) {
      seedGeocodeCacheFromBundled(this.cache as Map<string, { lat: number; lng: number; provider?: string } | null>);
    }
    this.loaded = true;
  }

  get(address: string) {
    return this.cache.get(address.trim().toLowerCase());
  }

  set(address: string, result: GeocodeResult | null) {
    const cacheKey = address.trim().toLowerCase();
    const isRetryable = result && 'retryable' in result && result.retryable;
    if (!isRetryable) this.cache.set(cacheKey, result);
  }

  clear() {
    this.cache.clear();
    this.loaded = false;
  }

  persist() {
    void persistGeocodeCache(this.cache);
  }
}

async function geocodeOnce(
  query: string,
  cache: TransportGeocodeCache,
  useBundledMappoint: boolean,
): Promise<GeocodeResult | null> {
  const bundled = useBundledMappoint ? resolveBundledGeocodeResult(query) : null;
  if (bundled) {
    cache.set(query, bundled);
    return bundled;
  }
  const cached = cache.get(query);
  if (cached !== undefined) return cached;
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke('route-optimizer', {
        body: { action: 'geocode', address: query },
      });
      if (error) {
        const msg = error.message || '';
        const isTransient = /not found|404|fetch|network|failed to send/i.test(msg);
        if (isTransient && attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 400 * attempt));
          continue;
        }
        return { error: msg, retryable: true };
      }
      const result = geocodePayloadToResult(data as Record<string, unknown>);
      cache.set(query, result);
      return result;
    } catch {
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 400 * attempt));
        continue;
      }
    }
  }
  return null;
}

export async function geocodeAddress(
  address: string,
  cache: TransportGeocodeCache,
  useBundledMappoint = true,
): Promise<GeocodeResult | null> {
  const query = sanitizeTransportGeocodeAddress(address) || address.trim();
  const candidates = streetSuffixGeocodeCandidates(query);
  const scored: { address: string; lat: number; lng: number; label?: string }[] = [];
  let lastError: GeocodeResult | null = null;

  for (const candidate of candidates) {
    const result = await geocodeOnce(candidate, cache, useBundledMappoint);
    if (isGeocodePoint(result)) {
      scored.push({
        address: candidate,
        lat: result.lat,
        lng: result.lng,
        label: result.label,
      });
      if (geocodeLabelMatchScore(candidate, result.label) >= 6) break;
    } else {
      lastError = result;
    }
    if (!isSuspiciousStreetSuffixAddress(query)) break;
  }

  const picked = pickPreferredStreetGeocode(query, scored);
  if (!picked) return lastError;
  const result: GeocodeResult = {
    lat: picked.lat,
    lng: picked.lng,
    label: picked.label,
    correctedAddress: picked.address.toLowerCase() !== query.toLowerCase() ? picked.address : undefined,
  };
  cache.set(address, result);
  cache.set(query, result);
  cache.set(picked.address, result);
  return result;
}

export async function geocodeBatch(
  addresses: string[],
  concurrency: number,
  cache: TransportGeocodeCache,
  onEach?: (index: number, result: GeocodeResult | null) => void,
  useBundledMappoint = true,
): Promise<(GeocodeResult | null)[]> {
  const results: (GeocodeResult | null)[] = new Array(addresses.length).fill(null);
  const pending: { index: number; address: string }[] = [];

  addresses.forEach((address, i) => {
    const query = sanitizeTransportGeocodeAddress(address) || address.trim();
    const bundled = useBundledMappoint ? resolveBundledGeocodeResult(query) : null;
    if (bundled) {
      cache.set(address, bundled);
      cache.set(query, bundled);
      results[i] = bundled;
      onEach?.(i, bundled);
      return;
    }
    const cached = cache.get(query);
    if (cached !== undefined) {
      results[i] = cached;
      onEach?.(i, cached);
      return;
    }
    pending.push({ index: i, address: query });
  });

  const CHUNK = 50;
  const batchConcurrency = Math.min(concurrency, 6);
  let sawRateLimit = false;

  for (let start = 0; start < pending.length; start += CHUNK) {
    const slice = pending.slice(start, start + CHUNK);
    const chunkAddresses = slice.map((p) => p.address);
    let batchResults: Record<string, unknown>[] | null = null;

    try {
      const { data, error } = await supabase.functions.invoke('route-optimizer', {
        body: { action: 'geocodeBatch', addresses: chunkAddresses, concurrency: batchConcurrency },
      });
      if (!error && Array.isArray((data as { results?: unknown[] })?.results)) {
        batchResults = (data as { results: Record<string, unknown>[] }).results;
      }
    } catch {
      // retry below
    }

    const unresolved: typeof slice = [];
    if (batchResults) {
      batchResults.forEach((item, j) => {
        const entry = slice[j];
        if (!entry) return;
        const result = geocodePayloadToResult(item);
        if (!isRetryableGeocodeFailure(result)) cache.set(entry.address, result);
        results[entry.index] = result;
        onEach?.(entry.index, result);
        if (!isGeocodePoint(result) && isRetryableGeocodeFailure(result)) {
          sawRateLimit = true;
          unresolved.push(entry);
        } else if (!isGeocodePoint(result)) {
          unresolved.push(entry);
        }
      });
    } else {
      unresolved.push(...slice);
    }

    if (unresolved.length > 0) {
      const parallel = Math.min(Math.max(concurrency, 1), 4);
      for (let u = 0; u < unresolved.length; u += parallel) {
        const group = unresolved.slice(u, u + parallel);
        const groupResults = await Promise.all(
          group.map((entry) => geocodeAddress(entry.address, cache)),
        );
        group.forEach((entry, j) => {
          const result = groupResults[j] ?? null;
          results[entry.index] = result;
          onEach?.(entry.index, result);
        });
      }
    }

    if (sawRateLimit && start + CHUNK < pending.length) {
      await new Promise((r) => setTimeout(r, 1200));
    }
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const retryEntries = pending.filter(({ index }) => {
      const current = results[index];
      return !isGeocodePoint(current) && isRetryableGeocodeFailure(current);
    });
    if (!retryEntries.length) break;
    await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
    for (let start = 0; start < retryEntries.length; start += CHUNK) {
      const slice = retryEntries.slice(start, start + CHUNK);
      const chunkAddresses = slice.map((p) => p.address);
      try {
        const { data, error } = await supabase.functions.invoke('route-optimizer', {
          body: { action: 'geocodeBatch', addresses: chunkAddresses, concurrency: 1 },
        });
        if (error || !Array.isArray((data as { results?: unknown[] })?.results)) continue;
        ((data as { results: Record<string, unknown>[] }).results).forEach((item, j) => {
          const entry = slice[j];
          if (!entry) return;
          const result = geocodePayloadToResult(item);
          if (!isRetryableGeocodeFailure(result)) cache.set(entry.address, result);
          results[entry.index] = result;
          onEach?.(entry.index, result);
        });
      } catch {
        // keep partial
      }
      if (start + CHUNK < retryEntries.length) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  for (let i = 0; i < addresses.length; i++) {
    const query = sanitizeTransportGeocodeAddress(addresses[i] ?? '') || (addresses[i] ?? '').trim();
    if (!isSuspiciousStreetSuffixAddress(query)) continue;
    const current = results[i];
    if (isGeocodePoint(current) && geocodeLabelMatchScore(query, current.label) >= 6) continue;
    const refined = await geocodeAddress(query, cache, useBundledMappoint);
    results[i] = refined;
    onEach?.(i, refined);
  }

  cache.persist();
  return results;
}
