# Project assets

Canonical home for visual assets shared across the project — landing page, decks, wiki, README screenshots, OG images, etc. One source of truth so the same image isn't redrawn or version-skewed across surfaces.

## Conventions

- **Filenames:** kebab-case, descriptive of the *thing depicted*, not the *surface using it*. `echo-system-architecture.png`, not `landing-hero.png`.
- **Formats:** PNG for raster diagrams (lossless, alpha). SVG for diagrams that started as vectors. JPG only for photographs.
- **Resolution:** ship the highest-quality original you have. Surfaces (landing, deck) downsample as needed.
- **Don't put work-in-progress mockups here.** Those live in `raw/internal/decisions/` next to the decision they support, or in your local sketches.

## Inventory

| File | Purpose | Surfaces using it |
|---|---|---|
| `echo-system-architecture.png` | The hero system-architecture render: five tool categories (Communication, Meetings, Domain Work, Docs/Ledger, Design/Canvas) with locked in-tool AIs, ECHO unified context layer underneath, system foundation (system services / OS kernel / hardware), AI clients on the right (ChatGPT, Claude, Gemini, Copilot, Local LLMs, Agents), on-device/private/secure trust strip. | `landing/index.html` (mirrored at `landing/hero-diagram.png`) |

## How surfaces consume these

The landing page deploys as a self-contained `landing/` directory (Vercel/Cloudflare Pages root), so it needs its own copy. The pattern: keep the canonical here, mirror into surface folders.

To re-mirror after updating a canonical asset:

```bash
cp assets/echo-system-architecture.png landing/hero-diagram.png
```

Add new mirror lines as more surfaces consume the asset.
