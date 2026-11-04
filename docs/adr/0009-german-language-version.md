# 0009. German language version under /de

Date: 2026-10-30
Status: Accepted

## Context

Most people looking for a flat in Germany read German first, and the site was English only. The site is a static
export (no server), so language cannot be negotiated per request. Pages mix server components (most text) and client
components (charts, finder, map).

## Decision

- English stays at the root (`/cities`), German lives under `/de` (`/de/cities`). Each route in `web/app/` and
  `web/app/de/` is a thin file that renders a shared view from `web/views/` with `lang="en"` or `lang="de"`.
- Server views pick text with `tx(lang)(en, de)`; client components read the language from the URL with `useI18n()`.
  Short labels inside shared server parts use the `<T en de />` component.
- Numbers and dates go through `fmt(lang)` (de-DE: decimal comma, space before % and €).
- The EN | DE switch in the header links to the same page in the other language and stores the choice in
  `localStorage` (`immodash-lang`); only the bare home page redirects to `/de` for a returning German reader.
- Every page sets `hreflang` alternates and a canonical URL through `pageMeta`.
- AI city summaries stay English for now (marked `lang="en"` and labelled on German pages).

## Consequences

- Every new text needs both languages; `tsc` does not catch a missing German string, so review `/de` pages.
- Two HTML files per page; build time and output roughly double (still well under a minute).
- German city summaries would need a German prompt and a grounding check that accepts German number formats.
