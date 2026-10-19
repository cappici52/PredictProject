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

## Data honesty
Real data only; source per draw. Show available coverage for 5/10/20 years, latest saved draw, last successful GLO check and failed refresh state. Missing data is never fabricated. Manual inputs are calculation context, not confirmed results.
