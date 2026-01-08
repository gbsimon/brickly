// Rebrickable API Client
// This is used server-side only to proxy requests

const REBRICKABLE_API_BASE = 'https://rebrickable.com/api/v3/lego';

export interface RebrickableClientConfig {
  apiKey: string;
}

export class RebrickableClient {
  private apiKey: string;

  constructor(config: RebrickableClientConfig) {
    this.apiKey = config.apiKey;
  }

  private async fetchFromRebrickable<T>(
    endpoint: string,
    params?: Record<string, string>
  ): Promise<T> {
    const url = new URL(`${REBRICKABLE_API_BASE}${endpoint}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `key ${this.apiKey}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Rebrickable API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json();
  }

  async searchSets(query: string, page = 1, pageSize = 20) {
    const params: Record<string, string> = {
      page: page.toString(),
      page_size: pageSize.toString(),
    };

    // Rebrickable search uses 'search' parameter
    if (query) {
      params.search = query;
    }

    return this.fetchFromRebrickable<import('./types').RebrickableSetSearchResponse>(
      '/sets/',
      params
    );
  }

  async getSet(setNum: string) {
    return this.fetchFromRebrickable<import('./types').RebrickableSetDetail>(
      `/sets/${encodeURIComponent(setNum)}/`
    );
  }

  async getSetParts(setNum: string, page = 1, pageSize = 1000) {
    const params: Record<string, string> = {
      page: page.toString(),
      page_size: pageSize.toString(),
    };

    return this.fetchFromRebrickable<import('./types').RebrickableSetPartsResponse>(
      `/sets/${encodeURIComponent(setNum)}/parts/`,
      params
    );
  }

  async getSetMinifigs(setNum: string, page = 1, pageSize = 1000) {
    const params: Record<string, string> = {
      page: page.toString(),
      page_size: pageSize.toString(),
    };

    return this.fetchFromRebrickable<import('./types').RebrickableSetMinifigsResponse>(
      `/sets/${encodeURIComponent(setNum)}/minifigs/`,
      params
    );
  }

  async getMinifig(minifigSetNum: string) {
    return this.fetchFromRebrickable<import('./types').RebrickableMinifigDetail>(
      `/minifigs/${encodeURIComponent(minifigSetNum)}/`
    );
  }

  async getMinifigParts(minifigSetNum: string, page = 1, pageSize = 1000) {
    const params: Record<string, string> = {
      page: page.toString(),
      page_size: pageSize.toString(),
    };

    return this.fetchFromRebrickable<import('./types').RebrickableMinifigPartsResponse>(
      `/minifigs/${encodeURIComponent(minifigSetNum)}/parts/`,
      params
    );
  }
}

export function createRebrickableClient(): RebrickableClient {
  const apiKey = process.env.REBRICKABLE_API_KEY;
  
  if (!apiKey) {
    throw new Error('REBRICKABLE_API_KEY environment variable is not set');
  }

  return new RebrickableClient({ apiKey });
}
