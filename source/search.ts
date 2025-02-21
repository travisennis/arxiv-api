import { XMLParser } from "fast-xml-parser";

// Types
type Prefix = "all" | "ti" | "au" | "abs" | "co" | "jr" | "cat" | "rn";
type SortByOption = "relevance" | "lastUpdatedDate" | "submittedDate";
type SortOrderOption = "ascending" | "descending";

interface Tag {
  name: string;
  prefix?: Prefix;
}

interface TagGroup {
  include: Tag[];
  exclude?: Tag[];
}

interface SearchParams {
  searchQueryParams: TagGroup[];
  sortBy?: SortByOption | undefined;
  sortOrder?: SortOrderOption | undefined;
  start?: number | undefined;
  maxResults?: number;
}

interface ArxivLink {
  href: string;
  rel: string;
  type: string;
}

interface ArxivCategory {
  term: string;
  scheme: string;
}

interface ArxivEntry {
  id: string;
  title: string;
  summary: string;
  authors: string[];
  links: ArxivLink[];
  published: string;
  updated: string;
  categories: ArxivCategory[];
}

// Constants
export const PREFIXES: Record<Prefix, Prefix> = {
  all: "all",
  ti: "ti",
  au: "au",
  abs: "abs",
  co: "co",
  jr: "jr",
  cat: "cat",
  rn: "rn",
} as const;

export const SEPARATORS = {
  and: "+AND+",
  or: "+OR+",
  andnot: "+ANDNOT+",
} as const;

export const SORT_BY: Record<string, SortByOption> = {
  relevance: "relevance",
  lastUpdatedDate: "lastUpdatedDate",
  submittedDate: "submittedDate",
} as const;

export const SORT_ORDER: Record<string, SortOrderOption> = {
  ascending: "ascending",
  descending: "descending",
} as const;

// Helper functions
const getArxivUrl = ({
  searchQuery,
  sortBy,
  sortOrder,
  start,
  maxResults,
}: {
  searchQuery: string;
  sortBy: string | undefined;
  sortOrder: string | undefined;
  start: number;
  maxResults: number;
}): string => {
  return `http://export.arxiv.org/api/query?search_query=${searchQuery}&start=${start}&max_results=${maxResults}${
    sortBy ? `&sortBy=${sortBy}` : ""
  }${sortOrder ? `&sortOrder=${sortOrder}` : ""}`;
};

// links: {
//   html:
//     entry.link?.find((link) => link.$type?.includes("html"))?.["$href"] ??
//     "",
//   pdf:
//     entry.link?.find((link) => link.$type?.includes("pdf"))?.["$href"] ??
//     "",
// },

function parseArxivObject(entry: any): ArxivEntry {
  return {
    id: entry.id ?? "",
    title: entry.title ?? "",
    summary: entry.summary?.trim() ?? "",
    authors:
      (entry.author && Array.isArray(entry.author)
        ? entry.author
        : [entry.author]
      ).map((author: { name: string }) => author.name) ?? [],
    links:
      entry.link?.map(
        (link: { $href: string; $rel: string; $type: string }) => ({
          href: link.$href,
          type: link.$type,
        }),
      ) ?? [],
    published: entry.published ?? "",
    updated: entry.updated ?? "",
    categories: (entry.category && Array.isArray(entry.category)
      ? entry.category
      : [entry.category]
    ).map((category: { $term: string }) => category.$term),
  };
}

function parseTag({ name, prefix = PREFIXES.all }: Tag): string {
  if (typeof name !== "string" || name.trim() === "") {
    throw new Error("you must specify tag name");
  }
  if (!Object.values(PREFIXES).includes(prefix)) {
    throw new Error(`unsupported prefix: ${prefix}`);
  }
  return `${prefix}:${name}`;
}

function parseTags({ include, exclude = [] }: TagGroup): string {
  if (!(Array.isArray(include) && Array.isArray(exclude))) {
    throw new Error("include and exclude must be arrays");
  }
  if (include.length === 0) {
    throw new Error("include is a mandatory field");
  }

  const includeStr = include.map(parseTag).join(SEPARATORS.and);
  const excludeStr =
    exclude.length > 0
      ? SEPARATORS.andnot + exclude.map(parseTag).join(SEPARATORS.andnot)
      : "";

  return includeStr + excludeStr;
}

/**
 * Fetch data from arXiv API
 */
export async function search({
  searchQueryParams,
  sortBy,
  sortOrder,
  start = 0,
  maxResults = 20,
}: SearchParams): Promise<ArxivEntry[]> {
  if (!Array.isArray(searchQueryParams)) {
    throw new Error("query param must be an array");
  }
  if (sortBy && !Object.values(SORT_BY).includes(sortBy)) {
    throw new Error(
      `unsupported sort by option. should be one of: ${Object.values(SORT_BY).join(" ")}`,
    );
  }
  if (sortOrder && !Object.values(SORT_ORDER).includes(sortOrder)) {
    throw new Error(
      `unsupported sort order option. should be one of: ${Object.values(SORT_ORDER).join(" ")}`,
    );
  }

  const searchQuery = searchQueryParams.map(parseTags).join(SEPARATORS.or);
  const response = await fetch(
    getArxivUrl({ searchQuery, sortBy, sortOrder, start, maxResults }),
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const xmlText = await response.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "$",
    textNodeName: "text",
  });

  const parsedData = parser.parse(xmlText);
  const entries = parsedData?.feed?.entry ?? [];

  return Array.isArray(entries) ? entries.map(parseArxivObject) : [];
}

export function searchFor(query: string) {
  return search({
    searchQueryParams: [
      { include: [{ name: query }, { name: "cs*", prefix: "cat" }] },
    ],
    sortBy: "lastUpdatedDate",
  });
}

async function main() {
  const results = await searchFor("ai agent memory");
  console.info(JSON.stringify(results, null, 2));
}

main();
