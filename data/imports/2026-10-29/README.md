# Import batch 2026-10-29

Research for eight venues, gathered from web search results only. The research environment could not open the pages themselves.

- Every row is `source_method=search_snippet`, so confidence is capped at `medium`. Undated pages are `low`.
- The `evidence` column quotes the search tool's summary of each page. A summary can paraphrase the page, so each row still needs a direct page review before its confidence can rise.
- Excluded on purpose:
  - Pittsburgh Gold 1A and 1B: unclear whether they are lots or parts of the Gold 1 Garage.
  - Prices contradicted by an official source (see each research note).

Imported with:

    npm run inventory -- import data/imports/2026-10-29/*.csv
