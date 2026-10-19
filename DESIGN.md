---
name: Lucky Pixel
description: A personal Thai lottery statistics workbench in a retro pixel style.
---

# Design System

## Overview
Product register. A quiet retro research desk: the 100-cell mint heatmap is the signature, with stepped borders and restrained pixel ornament. Thai copy stays readable. Statistical observations never imply guaranteed future wins.

## Colors
Runtime source of truth: CSS custom properties in src/styles.css. Keep this document synchronized with those tokens.
- Background: #101820 (--bg)
- Surface: #17232c (--surface)
- Border: #34464d (--line)
- Text: #f2eedb (--text)
- Muted: #a6b4b6 (--muted)
- Mint: #b0dda1 (--mint)
- Yellow: #f2d479 (--yellow)
- Error: #ffb4a6 (--error)

## Typography
Thai body: Tahoma, system sans-serif; headings bold. Utility and numerical display: Courier New, monospace, bold. Large numbers carry the pixel rhythm without compromising Thai legibility.

## Layout
Centered 1320px workbench. Primary heatmap with latest-draw and history rail. Below: calculation form, ranked outputs, validation details. At 900px rail stacks; at 540px heatmap keeps 10 columns with compact cells. Document owns scrolling; history owns a bounded internal scroll.

## Spacing
4px base; 8, 12, 16, 24, 32, 48px. Desktop panel padding 24px; mobile 14px.

## Elevation & Depth
Panels stay flat. Controls have small solid offsets only. Focus ring is yellow and offset from boundaries.

## Shapes
Square corners; stepped 2px panel corners and offset 3px button shadows. No gradients or soft floating shadows.

## Iconography
Small code-native pixel clover and stars; simple line icons. Decoration is hidden from assistive technology.

## Motion
120ms control transitions only. Respect prefers-reduced-motion. No flashing or automatic number shuffling.

## Components
All buttons share hover, active, focus-visible and disabled rules. Heatmap buttons expose number, count and selected state. Inline form errors and async live status use the same visual language. Native details owns expandable methodology. No modal is needed.

The 1–20 year selector uses the operating system's native popup, with a square ink trigger and yellow value. Top 10 tables reuse the existing result palette, monospaced digits and semantic table layout. Two tables sit side by side on desktop and stack below 900px. Native details exposes row evidence without expanding every explanation at once.

Six-digit validation reuses result headings, bordered metric blocks, native details and the existing table scroll owner. A yellow text callout reports the observed comparison against legacy and uniform models. Wide comparison tables scroll inside their own container on phones; the page must not overflow. Keep two-digit and six-digit validation visibly labeled as separate sections.

Fully tied six-digit scores show an honest no-ranking state in place of a primary number and Top 10 table. An outlined mint button can explicitly reveal the best experimental non-uniform formula; show its yellow disclosure and holdout results beside that ranking. Keep experimental results distinct from the validated selection and hidden by default.

User-provided single-digit formulas live in a separate panel after the existing analysis. Reuse native date inputs, the shared field style, yellow action button and bordered result cards. Show three cards on desktop and stack on mobile. Each card exposes arithmetic, one large digit and clearly labeled retrospective digit-containment counts. Histories use native details and bounded scrolling; never replace the original ranked outputs.

## Data honesty
Real data only; source per draw. Show available coverage for each year window from 1 through 20, latest saved draw, last successful GLO check and failed refresh state. Missing data is never fabricated. Manual inputs are calculation context, not confirmed results. Short windows below 60 draws still rank by frequency (smoothed for six digits), with an explicit no-validation message. Top 10 means the model's ranking, not a claim that those numbers have proven higher odds. If uniform is selected, explicitly describe the tied scores and numerical display order. Distinguish exact six-digit primary hits, Top 10 hits and digit-position accuracy; compare formulas using per-digit log loss on held-out dates.
