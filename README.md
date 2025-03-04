# @travisennis/arxiv-api

## Usage
```typescript
const searchClient = createSearch();
const results = await searchClient
  .inCategory("cs*")
  .withQuery("ai agent memory")
  .sortBy("lastUpdatedDate")
  .search();
console.info(JSON.stringify(results, null, 2));
```
