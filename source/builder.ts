import { search, PREFIXES } from "./search.ts";
import type {
  Prefix,
  SortByOption,
  SortOrderOption,
  SearchParams,
  ArxivEntry,
} from "./search.ts";

export class ArxivSearch {
  private params: SearchParams = {
    searchQueryParams: [{ include: [], exclude: [] }],
    start: 0,
    maxResults: 20,
  };

  withQuery(query: string): ArxivSearch {
    if (this.params.searchQueryParams[0]?.include) {
      this.params.searchQueryParams[0].include.push({ name: query });
    }
    return this;
  }

  withTag(name: string, prefix: Prefix = PREFIXES.all): ArxivSearch {
    if (this.params.searchQueryParams[0]?.include) {
      this.params.searchQueryParams[0].include.push({ name, prefix });
    }
    return this;
  }

  excludeTag(name: string, prefix: Prefix = PREFIXES.all): ArxivSearch {
    if (this.params.searchQueryParams[0]) {
      if (!this.params.searchQueryParams[0].exclude) {
        this.params.searchQueryParams[0].exclude = [];
      }
      this.params.searchQueryParams[0].exclude.push({ name, prefix });
    }
    return this;
  }

  inCategory(category: string): ArxivSearch {
    return this.withTag(category, PREFIXES.cat);
  }

  byAuthor(author: string): ArxivSearch {
    return this.withTag(author, PREFIXES.au);
  }

  sortBy(option: SortByOption): ArxivSearch {
    this.params.sortBy = option;
    return this;
  }

  sortOrder(order: SortOrderOption): ArxivSearch {
    this.params.sortOrder = order;
    return this;
  }

  startAt(start: number): ArxivSearch {
    this.params.start = start;
    return this;
  }

  maxResults(max: number): ArxivSearch {
    this.params.maxResults = max;
    return this;
  }

  search(): Promise<ArxivEntry[]> {
    return search(this.params);
  }
}

// Helper function to create a new builder instance
export function createSearch(): ArxivSearch {
  return new ArxivSearch();
}
