# Lucky Pixel interaction contract

## Business sources
User brief in this chat: personal use, no password, Thai language, 00–99 last-two prize frequency, 5/10/20-year filters, draw-date drilldown, automatic GLO updates, deterministic calculation of two two-digit sets and one six-digit set.
GLO catalog: https://gdcatalog.glo.or.th/dataset/dataset_c4-9_01 ; public latest and archive endpoints. GLO data remains attributed. Supplemental archive data must have its actual source shown.
Visual contract: DESIGN.md. No existing sibling screens or UI primitives in the empty workspace.

## Canonical owners
| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Table Selection | App heatmap buttons | User brief | one selected number | browser selection and date history |
| Date | shared Thai formatter and native date input | User brief and OS popup | date-only / timestamp | Asia/Bangkok, Buddhist years |
| Form | calculation form in App | User brief | manual override / latest draw | validation and deterministic output |
| Scrollbar | src/styles.css | DESIGN.md | global baseline | narrow and desktop browser |
| Toast | inline live status in App | UX-CONTRACT.md | loading / success / failure | API failure and recovery |

## State and navigation
Two in-page links target statistics and calculation sections. Year filter and selected number persist in URL query. Filtering clears calculation output to prevent stale context. History lists all matching dates in a bounded scroll area.

## Data lifecycle
Server reads local cache and seed archive, fetches GLO latest every 2 minutes while running, archive synchronization is resumable and throttled; dates deduplicate with GLO authoritative. Failed requests keep cache with explicit error. No auth, payments, account data, or destructive actions. Bind loopback by default. No public deployment was requested explicitly.

## Calculation
Deterministic statistical ranking, no LLM and no random number generator. Compare smoothing-based frequency, recent-weighted frequency, digit-frequency and previous-result transition models using chronological validation. Last 20% is a separate holdout, never used to select the model. No claim of a universally best formula. Display actual hit counts and 2% two-number reference rate. Six-digit result is a smoothed per-position estimate, with exact six-digit holdout hits disclosed. Previous manual results affect transition evidence without being inserted into confirmed history. Calculation uses only draws through the selected context date.

## Recovery and accessibility
No fabricated data. Empty history explains how to refresh/import. JSON import is validated atomically on the server. Inline errors focus the invalid field and expose aria-invalid. Semantic buttons, visible keyboard focus, native details. Disabled and loading states are explicit. Locale th-TH; timezone Asia/Bangkok. Filters preserve stable panel geometry.
