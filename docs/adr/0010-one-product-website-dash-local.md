# 0010. One product: the website; the Dash dashboard is a local analyst tool

Date: 2026-11-12
Status: Accepted (supersedes the "Dash first" part of 0004)

## Context

The audit of November 2026 (SWE-7, UX-8) found two user interfaces answering overlapping questions: the
public Next.js site and the Plotly Dash dashboard, which is one 737-line module. Maintaining both doubles the
work for every new metric, and it was not stated who each one is for.

## Decision

- The **website** is the product. Its primary user is a person renting, or about to rent, in Germany. The home
  page now says so.
- The **Dash dashboard** stays in the repository as a local analyst tool for exploring the warehouse during
  development. It is not deployed, not linked from the site and not part of the release checks beyond its
  existing tests. New public features are built in the website only.
- The Railway configuration stays as an optional self-hosting recipe.

## Consequences

- The public surface is one static site (smaller attack surface, one design system).
- Splitting `dashboard/app.py` into modules is only worth doing if the dashboard gets new work; until then it is
  frozen apart from fixes.
