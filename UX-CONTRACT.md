# Lucky Pixel interaction contract

## Business sources
User brief in this chat: personal use, no password, Thai language, 00–99 last-two prize frequency, yearly filters from 1 through 20, draw-date drilldown, automatic GLO updates, deterministic calculation of two two-digit sets and one six-digit set, plus Top 10 ranked candidates.
GLO catalog: https://gdcatalog.glo.or.th/dataset/dataset_c4-9_01 ; public latest and archive endpoints. GLO data remains attributed. Supplemental archive data must have its actual source shown.
Visual contract: DESIGN.md. No existing sibling screens or UI primitives in the empty workspace.

## Canonical owners
| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Table Selection | App heatmap buttons | User brief | one selected number | browser selection and date history |
| Select/Listbox | native year select in App | User request for 1–20 years | OS-owned popup; 20 integer values | keyboard, URL reload and narrow viewport |
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

Year filters share one committed value between the heatmap and calculation, persisted in the URL. At fewer than 60 draws use two-digit frequency ranking and six-digit smoothed frequency (alpha 10), without model selection or holdout metrics; zero draws produces an actionable error. Return ten distinct two-digit candidates and ten six-digit candidates, preserving the two primary two-digit sets and single primary six-digit result. Six-digit ranking multiplies independent positional normalized weights; ties sort by numeric string ascending. Each row expands its evidence with native details. Label all scores as model weights, never proven win probabilities. The two-digit Top 10 holdout result is reported separately with a 10% equal-chance reference.

## Six-digit model selection
The current user request authorizes comparison specifically for first-prize numbers. src/six-engine.mjs owns a fixed grid of nine candidates: uniform, per-position frequency alpha 1/10, recency half-life 24/48 with alpha 5, transition weights 0.1/1 with alpha 5, legacy alpha 1 plus transition 0.25, and a fixed 50/25/25 probability mixture. Do not tune this grid from final holdout outcomes. Use chronological 50% initial training, 30% selection and 20% final holdout; training expands using only prior observations. Select on mean per-digit log loss, freeze the model ID, then compare selected/legacy/uniform on the same final dates. Display exact primary hits, exact Top 10 hits, and per-position hits separately. Digit accuracy is never labeled six-digit win accuracy. If uniform is selected, explicitly state all one million sequences tie, and leading 000000–000009 are only the deterministic display order. Uniform exact-hit metrics use that same declared tie order. Final holdout loss comparisons describe this dataset, never proven future advantage. Top 10 evidence shows both raw positional frequency and the actual selected-model weight.

## User-provided experimental single-digit formulas
The latest user request authorizes adding three formulas while retaining all existing analysis. src/folk-engine.mjs owns arithmetic: previous last2 + last three digits of first, previous first-prize hundreds × tens, and actual target day-of-month + previous last2 + user-entered constant (integer 0–99, default 0); take the units digit in each case. Explicitly define "3 ตัวบน" as the first prize's last three digits. Keep outputs as single digits, without inventing a rule to turn them into two- or six-digit picks. Use the main previous-draw context and year filter; new inputs clear only this experimental result. Main context/year changes reset the entire experimental section via its key. Dates use native OS-owned inputs and must be valid and strictly later than the previous context date. Only prefill target dates from a known actual next draw; otherwise require entry, with no assumed future schedule. Backtest uses ordered pairs within the selected historical window ending on the context date, predicting from the earlier draw and the later actual date. Count one hit if the single digit appears anywhere in the actual last2 prize, even if present twice. Display denominator and positional hits, explicitly distinguishing this exploratory retrospective check from exact last2 wins and held-out evaluation. Never optimize a constant silently.

## Recovery and accessibility
When the selected six-digit distribution is fully tied, return no primary number and an empty public Top 10. Display "ยังจัดอันดับเลขเด่น 6 ตัวไม่ได้" in the result area. If uniform wins, an explicit collapsed-by-default experimental action may show the best non-uniform formula by selection-period loss, with its own holdout evaluation and warning. Determine that alternative before evaluating the holdout. Never silently replace the winner with the experimental formula. Fixed uniform tie-order predictions remain internal to reproducible benchmark hit metrics only, with their convention disclosed in the comparison section.

No fabricated data. Empty history explains how to refresh/import. JSON import is validated atomically on the server. Inline errors focus the invalid field and expose aria-invalid. Semantic buttons, visible keyboard focus, native details. Disabled and loading states are explicit. Locale th-TH; timezone Asia/Bangkok. Filters preserve stable panel geometry.
